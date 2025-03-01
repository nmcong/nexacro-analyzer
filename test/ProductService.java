package com.example.erp.service.product;

import java.util.List;
import java.util.Map;
import java.util.HashMap;
import java.util.ArrayList;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.example.erp.dao.ProductDao;
import com.example.erp.dto.ProductDTO;
import com.example.erp.dto.InventoryDTO;
import com.example.erp.dto.PriceHistoryDTO;
import com.example.erp.exception.BusinessException;
import com.example.erp.util.FileUtil;
import com.example.erp.util.SecurityUtil;

@Service
public class ProductService {

	@Autowired
	private ProductDao productDao;

	@Autowired
	private FileUtil fileUtil;

	@Autowired
	private SecurityUtil securityUtil;

	/**
	 * Search products with various criteria
	 * @param params Search parameters
	 * @return List of products matching criteria
	 */
	@Transactional(readOnly = true)
	public List<Map<String, Object>> searchProducts(Map<String, Object> params) {
		// Validate search parameters
		validateSearchParams(params);

		// Add default sorting if not provided
		if (!params.containsKey("sortColumn")) {
			params.put("sortColumn", "productName");
			params.put("sortOrder", "asc");
		}

		// Execute search
		return productDao.selectProductList(params);
	}

	/**
	 * Get detailed information about a specific product
	 * @param productId Product ID
	 * @return Product details
	 */
	@Transactional(readOnly = true)
	public Map<String, Object> getProductDetail(String productId) {
		// Validate product ID
		if (productId == null || productId.trim().isEmpty()) {
			throw new BusinessException("Product ID is required");
		}

		// Get product details
		Map<String, Object> productDetail = productDao.selectProductDetail(productId);

		if (productDetail == null) {
			throw new BusinessException("Product not found: " + productId);
		}

		// Get additional product information
		List<Map<String, Object>> categories = productDao.selectProductCategories(productId);
		List<Map<String, Object>> images = productDao.selectProductImages(productId);
		List<PriceHistoryDTO> priceHistory = productDao.selectProductPriceHistory(productId);

		// Combine all information
		Map<String, Object> result = new HashMap<>();
		result.put("product", productDetail);
		result.put("categories", categories);
		result.put("images", images);
		result.put("priceHistory", priceHistory);

		return result;
	}

	/**
	 * Get inventory information for a product across all locations
	 * @param productId Product ID
	 * @return Inventory information
	 */
	@Transactional(readOnly = true)
	public List<InventoryDTO> getProductInventory(String productId) {
		// Validate product ID
		if (productId == null || productId.trim().isEmpty()) {
			throw new BusinessException("Product ID is required");
		}

		// Get inventory data
		return productDao.selectProductInventory(productId);
	}

	/**
	 * Save product information (create new or update existing)
	 * @param productData Product data to save
	 * @param userId User performing the action
	 * @return Updated product ID
	 */
	@Transactional
	public String saveProduct(Map<String, Object> productData, String userId) {
		// Validate required fields
		validateProductData(productData);

		String productId = (String) productData.get("productId");
		boolean isNewProduct = (productId == null || productId.trim().isEmpty());

		// Set audit fields
		if (isNewProduct) {
			// Generate new product ID if not provided
			productId = generateProductId();
			productData.put("productId", productId);
			productData.put("createdBy", userId);
			productData.put("creationDate", new java.util.Date());
		}

		productData.put("lastUpdatedBy", userId);
		productData.put("lastUpdateDate", new java.util.Date());

		// Save or update product
		if (isNewProduct) {
			productDao.insertProduct(productData);
		} else {
			// Check if product exists
			Map<String, Object> existingProduct = productDao.selectProductDetail(productId);
			if (existingProduct == null) {
				throw new BusinessException("Product not found: " + productId);
			}

			productDao.updateProduct(productData);
		}

		// Handle categories if provided
		if (productData.containsKey("categories")) {
			saveProductCategories(productId, (List<String>) productData.get("categories"), userId);
		}

		// Handle price change if price updated
		if (productData.containsKey("price")) {
			Double newPrice = Double.parseDouble(productData.get("price").toString());
			Double oldPrice = null;

			if (!isNewProduct) {
				Map<String, Object> existingProduct = productDao.selectProductDetail(productId);
				oldPrice = Double.parseDouble(existingProduct.get("price").toString());
			}

			if (oldPrice == null || !newPrice.equals(oldPrice)) {
				// Record price change history
				PriceHistoryDTO priceHistory = new PriceHistoryDTO();
				priceHistory.setProductId(productId);
				priceHistory.setOldPrice(oldPrice);
				priceHistory.setNewPrice(newPrice);
				priceHistory.setChangeDate(new java.util.Date());
				priceHistory.setChangedBy(userId);
				priceHistory.setRemarks("Price update");

				productDao.insertPriceHistory(priceHistory);
			}
		}

		return productId;
	}

	/**
	 * Update product inventory
	 * @param inventoryData Inventory update data
	 * @param userId User performing the action
	 * @return Number of records updated
	 */
	@Transactional
	public int updateInventory(List<InventoryDTO> inventoryData, String userId) {
		if (inventoryData == null || inventoryData.isEmpty()) {
			throw new BusinessException("Inventory data is required");
		}

		int updatedCount = 0;

		for (InventoryDTO inventory : inventoryData) {
			// Set audit fields
			inventory.setLastUpdatedBy(userId);
			inventory.setLastUpdateDate(new java.util.Date());

			// Update inventory
			updatedCount += productDao.updateInventory(inventory);

			// Record inventory movement
			Map<String, Object> movement = new HashMap<>();
			movement.put("productId", inventory.getProductId());
			movement.put("locationId", inventory.getLocationId());
			movement.put("movementType", "ADJUSTMENT");
			movement.put("quantity", inventory.getQuantity());
			movement.put("remarks", inventory.getRemarks());
			movement.put("createdBy", userId);
			movement.put("creationDate", new java.util.Date());

			productDao.insertInventoryMovement(movement);
		}

		return updatedCount;
	}

	/**
	 * Delete a product (logical delete)
	 * @param productId Product ID to delete
	 * @param userId User performing the action
	 * @return True if deletion successful
	 */
	@Transactional
	public boolean deleteProduct(String productId, String userId) {
		// Validate product ID
		if (productId == null || productId.trim().isEmpty()) {
			throw new BusinessException("Product ID is required");
		}

		// Check if product exists
		Map<String, Object> existingProduct = productDao.selectProductDetail(productId);
		if (existingProduct == null) {
			throw new BusinessException("Product not found: " + productId);
		}

		// Check if product is used in any orders
		int orderCount = productDao.countProductOrders(productId);
		if (orderCount > 0) {
			throw new BusinessException("Cannot delete product as it is used in " + orderCount + " orders");
		}

		// Set deletion flags
		Map<String, Object> updateParams = new HashMap<>();
		updateParams.put("productId", productId);
		updateParams.put("isDeleted", true);
		updateParams.put("lastUpdatedBy", userId);
		updateParams.put("lastUpdateDate", new java.util.Date());

		// Perform logical delete
		int updated = productDao.updateProductStatus(updateParams);

		return updated > 0;
	}

	/**
	 * Upload product image
	 * @param productId Product ID
	 * @param imageFile Image file data
	 * @param userId User performing the action
	 * @return Uploaded image details
	 */
	@Transactional
	public Map<String, Object> uploadProductImage(String productId, Map<String, Object> imageFile, String userId) {
		// Validate parameters
		if (productId == null || productId.trim().isEmpty()) {
			throw new BusinessException("Product ID is required");
		}

		if (imageFile == null || !imageFile.containsKey("fileData")) {
			throw new BusinessException("Image file is required");
		}

		// Check if product exists
		Map<String, Object> existingProduct = productDao.selectProductDetail(productId);
		if (existingProduct == null) {
			throw new BusinessException("Product not found: " + productId);
		}

		// Process image upload
		try {
			// Save file to storage
			String fileId = fileUtil.saveFile(imageFile, "product_images");

			// Create image record
			Map<String, Object> imageRecord = new HashMap<>();
			imageRecord.put("productId", productId);
			imageRecord.put("imageUrl", fileUtil.getFileUrl(fileId));
			imageRecord.put("imageType", imageFile.get("fileType"));
			imageRecord.put("isPrimary", false); // Default to non-primary
			imageRecord.put("createdBy", userId);
			imageRecord.put("creationDate", new java.util.Date());

			// Insert image record
			productDao.insertProductImage(imageRecord);

			return imageRecord;
		} catch (Exception e) {
			throw new BusinessException("Error uploading product image: " + e.getMessage());
		}
	}

	/**
	 * Generate unique product ID
	 * @return New product ID
	 */
	private String generateProductId() {
		// Generate product ID prefix
		String prefix = "P";
		String timestamp = String.valueOf(System.currentTimeMillis()).substring(5);
		String random = String.valueOf((int)(Math.random() * 1000));

		return prefix + timestamp + random;
	}

	/**
	 * Validate product search parameters
	 * @param params Search parameters to validate
	 */
	private void validateSearchParams(Map<String, Object> params) {
		// Add validation logic here
	}

	/**
	 * Validate product data for saving
	 * @param productData Product data to validate
	 */
	private void validateProductData(Map<String, Object> productData) {
		if (productData == null) {
			throw new BusinessException("Product data is required");
		}

		// Validate product name
		if (!productData.containsKey("productName") ||
				productData.get("productName") == null ||
				productData.get("productName").toString().trim().isEmpty()) {
			throw new BusinessException("Product name is required");
		}

		// Validate price
		if (productData.containsKey("price")) {
			try {
				Double price = Double.parseDouble(productData.get("price").toString());
				if (price < 0) {
					throw new BusinessException("Price cannot be negative");
				}
			} catch (NumberFormatException e) {
				throw new BusinessException("Invalid price value");
			}
		}

		// Additional validations as needed
	}

	/**
	 * Save product categories
	 * @param productId Product ID
	 * @param categories List of category IDs
	 * @param userId User performing the action
	 */
	private void saveProductCategories(String productId, List<String> categories, String userId) {
		if (categories == null || categories.isEmpty()) {
			return;
		}

		// Delete existing categories
		productDao.deleteProductCategories(productId);

		// Insert new categories
		for (String categoryId : categories) {
			Map<String, Object> categoryMap = new HashMap<>();
			categoryMap.put("productId", productId);
			categoryMap.put("categoryId", categoryId);
			categoryMap.put("createdBy", userId);
			categoryMap.put("creationDate", new java.util.Date());

			productDao.insertProductCategory(categoryMap);
		}
	}
}