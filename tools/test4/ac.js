this.Button00_onclick = function(obj:nexacro.Button,e:nexacro.ClickEventInfo)
{
    alert("Button clicked!");
    var message = "Processing...";
    this.Edit00.set_value("New Value");
    
    // Multi-line string
    var longText = "This is a long text\n" + 
                  "that spans multiple\n" +
                  "lines";
                  
    // String with quotes
    var mixed = 'He said "Hello" and left';
    var another = "It's a nice day";
}