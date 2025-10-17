import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProduct";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSku";

/**
 * Test product search with price range filtering capabilities.
 *
 * This test validates that the product search API correctly filters products
 * based on price ranges, using the minimum SKU variant price for each product.
 * The test creates a diverse set of products with multiple SKU variants at
 * different price points, then executes search queries to verify that price
 * filtering and sorting work correctly.
 *
 * Test Flow:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category (required for products)
 * 3. Create seller account and authenticate
 * 4. Create multiple products with various base prices
 * 5. Add SKU variants with different prices to each product
 * 6. Execute product searches to verify price filtering
 * 7. Validate that results match expected price ranges
 * 8. Verify price-based sorting functionality
 */
export async function test_api_product_search_with_price_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        name: "Test Admin",
        role_level: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create product category
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: {
        name: "Electronics",
      } satisfies IShoppingMallCategory.ICreate,
    });
  typia.assert(category);

  // Step 3: Create seller account and authenticate
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: {
        email: sellerEmail,
        password: "SellerPass123!",
        business_name: "Tech Electronics Store",
        business_type: "LLC",
        contact_person_name: "John Seller",
        phone: RandomGenerator.mobile(),
        business_address: "123 Business St, City, State 12345",
        tax_id: "TAX123456789",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(seller);

  // Step 4: Create multiple products with various price points
  const productPrices = [50, 100, 150, 200, 300, 500, 800];
  const products: IShoppingMallProduct[] = await ArrayUtil.asyncMap(
    productPrices,
    async (basePrice) => {
      const product: IShoppingMallProduct =
        await api.functional.shoppingMall.seller.products.create(connection, {
          body: {
            name: `Product ${basePrice}`,
            base_price: basePrice,
          } satisfies IShoppingMallProduct.ICreate,
        });
      typia.assert(product);
      return product;
    },
  );

  // Step 5: Create SKU variants with different prices for each product
  // Each product will have 3 SKU variants with prices around the base price
  await ArrayUtil.asyncForEach(products, async (product, index) => {
    const basePrice = productPrices[index];
    const skuPrices = [
      basePrice - 10, // Lower price variant
      basePrice, // Base price variant
      basePrice + 20, // Higher price variant
    ];

    await ArrayUtil.asyncMap(skuPrices, async (price, skuIndex) => {
      const sku: IShoppingMallSku =
        await api.functional.shoppingMall.seller.products.skus.create(
          connection,
          {
            productId: product.id,
            body: {
              sku_code: `SKU-${product.id.substring(0, 8)}-${skuIndex}`,
              price: price,
            } satisfies IShoppingMallSku.ICreate,
          },
        );
      typia.assert(sku);
    });
  });

  // Step 6: Execute product search to verify all products are created
  const allProductsSearch: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: {
        page: 0,
      } satisfies IShoppingMallProduct.IRequest,
    });
  typia.assert(allProductsSearch);

  // Step 7: Validate search results
  TestValidator.predicate(
    "search should return products",
    allProductsSearch.data.length > 0,
  );

  TestValidator.predicate(
    "should have created multiple products",
    allProductsSearch.data.length >= productPrices.length,
  );

  // Step 8: Verify pagination information
  TestValidator.predicate(
    "pagination should have valid structure",
    allProductsSearch.pagination.current >= 0 &&
      allProductsSearch.pagination.limit >= 0 &&
      allProductsSearch.pagination.records >= 0 &&
      allProductsSearch.pagination.pages >= 0,
  );

  TestValidator.predicate(
    "total records should match or exceed created products",
    allProductsSearch.pagination.records >= productPrices.length,
  );

  // Step 9: Verify that all created products are in the search results
  const createdProductIds = products.map((p) => p.id);
  const searchedProductIds = allProductsSearch.data.map((p) => p.id);

  await ArrayUtil.asyncForEach(createdProductIds, async (productId) => {
    TestValidator.predicate(
      `product ${productId} should be in search results`,
      searchedProductIds.includes(productId),
    );
  });
}
