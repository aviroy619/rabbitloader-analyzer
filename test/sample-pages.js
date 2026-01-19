// test/sample-pages.js
const samplePages = {
    // Page with jQuery listeners (HIGH RISK)
    jqueryPage: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>jQuery Page</title>
      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    </head>
    <body>
      <div class="product-filter">Filter Products</div>
      <button id="submit-btn">Submit</button>
      
      <script>
        // jQuery event listeners
        $('.product-filter').on('click', function() {
          alert('Filter clicked');
        });
        
        $('#submit-btn').click(function() {
          console.log('Submit clicked');
        });
      </script>
    </body>
    </html>
  `,

    // Simple page with tracking (LOW RISK)
    trackingPage: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Tracking Page</title>
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/css/bootstrap.min.css">
    </head>
    <body>
      <h1>Welcome</h1>
      <p>This is a safe page</p>
      
      <script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
      <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'GA_ID');
      </script>
    </body>
    </html>
  `,

    // Page with inline events (HIGH RISK)
    inlineEventPage: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Inline Events</title>
    </head>
    <body>
      <button onclick="handleClick()">Click Me</button>
      <div onload="initPage()">Content</div>
      
      <script>
        function handleClick() {
          console.log('Clicked');
        }
      </script>
    </body>
    </html>
  `,

    // Complex page (MEDIUM RISK)
    complexPage: `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Complex Page</title>
      <style>
        .container { max-width: 1200px; }
        .btn-primary { background: #007bff; }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>E-commerce Store</h1>
        <div class="product-list">
          <div class="product">
            <img src="product.jpg" alt="Product">
            <h2>Product Name</h2>
            <button class="btn-primary">Buy Now</button>
          </div>
        </div>
      </div>
      
      <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
      <script>
        // Custom initialization
        (function() {
          var config = { apiUrl: '/api' };
          $('.product-list').on('click', '.btn-primary', function() {
            console.log('Add to cart');
          });
        })();
      </script>
      
      <script async src="https://www.googletagmanager.com/gtag/js?id=GA_ID"></script>
    </body>
    </html>
  `
};

module.exports = samplePages;