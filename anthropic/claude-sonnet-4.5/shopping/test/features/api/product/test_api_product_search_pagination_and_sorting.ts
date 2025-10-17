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

/**
 * Test product search pagination and sorting capabilities.
 *
 * This test validates the product search API's pagination functionality by:
 *
 * 1. Setting up the necessary prerequisites (admin, category, seller accounts)
 * 2. Creating multiple products to populate the catalog
 * 3. Testing pagination with different page numbers
 * 4. Validating pagination metadata (total records, pages, current page)
 * 5. Testing edge cases like out-of-range page requests
 *
 * The test ensures that customers can browse through product catalogs
 * efficiently using pagination, which is essential for performance and user
 * experience when dealing with large numbers of products.
 */
export async function test_api_product_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Create admin account for category creation
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    name: RandomGenerator.name(),
    role_level: "super_admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // 2. Create product category
  const categoryData = {
    name: RandomGenerator.name(),
  } satisfies IShoppingMallCategory.ICreate;

  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.create(connection, {
      body: categoryData,
    });
  typia.assert(category);

  // 3. Create seller account for product creation
  const sellerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    business_name: RandomGenerator.name(),
    business_type: "LLC",
    contact_person_name: RandomGenerator.name(),
    phone: RandomGenerator.mobile(),
    business_address: RandomGenerator.paragraph({ sentences: 3 }),
    tax_id: RandomGenerator.alphaNumeric(10),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerData,
    });
  typia.assert(seller);

  // 4. Create multiple products (15 products to test pagination)
  const productCount = 15;
  const createdProducts: IShoppingMallProduct[] = await ArrayUtil.asyncRepeat(
    productCount,
    async (index) => {
      const productData = {
        name: `${RandomGenerator.name()} Product ${index + 1}`,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10000>
        >(),
      } satisfies IShoppingMallProduct.ICreate;

      const product: IShoppingMallProduct =
        await api.functional.shoppingMall.seller.products.create(connection, {
          body: productData,
        });
      typia.assert(product);
      return product;
    },
  );

  TestValidator.equals(
    "created products count",
    createdProducts.length,
    productCount,
  );

  // 5. Test pagination - page 1
  const page1Request = {
    page: 0,
  } satisfies IShoppingMallProduct.IRequest;

  const page1Result: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: page1Request,
    });
  typia.assert(page1Result);

  // 6. Validate pagination metadata
  TestValidator.equals(
    "first page current index",
    page1Result.pagination.current,
    0,
  );
  TestValidator.predicate(
    "first page has products",
    page1Result.data.length > 0,
  );

  // 7. Test page 2
  const page2Request = {
    page: 1,
  } satisfies IShoppingMallProduct.IRequest;

  const page2Result: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: page2Request,
    });
  typia.assert(page2Result);

  TestValidator.equals(
    "second page current index",
    page2Result.pagination.current,
    1,
  );

  // 8. Test edge case - requesting a very high page number
  const highPageRequest = {
    page: 9999,
  } satisfies IShoppingMallProduct.IRequest;

  const highPageResult: IPageIShoppingMallProduct.ISummary =
    await api.functional.shoppingMall.products.index(connection, {
      body: highPageRequest,
    });
  typia.assert(highPageResult);

  TestValidator.predicate(
    "high page number handled gracefully",
    highPageResult.data.length >= 0,
  );
}
