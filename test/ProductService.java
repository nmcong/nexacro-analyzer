package com.example.product;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import java.util.List;

@Service
public class ProductService {

	@Transactional(readOnly = true)
	public Map<String, Object> getProductDetail(String productId) {
		// Implementation code
		return productDao.selectProductDetail(productId);
	}

	@Transactional
	public int saveProduct(Map<String, Object> productData, String userId) {
		// Implementation code
		return productDao.updateProduct(productData);
	}

	@Transactional(readOnly = true)
	public List<Map<String, Object>> searchProducts(Map<String, Object> searchParams) {
		// Implementation code
		return productDao.selectProductList(searchParams);
	}
}