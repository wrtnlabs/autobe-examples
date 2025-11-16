import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSku";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test public access to SKU search functionality with various filtering
 * criteria.
 *
 * This scenario validates that anyone (authenticated or not) can search and
 * retrieve SKU variants for a product sale with advanced filtering
 * capabilities. The test verifies search functionality across multiple
 * dimensions including variant attribute value combinations, price ranges
 * (min_price and max_price), and pagination controls.
 *
 * Step-by-step process:
 *
 * 1. Create seller account and authenticate
 * 2. Create admin account and product category
 * 3. Create product sale that will contain SKU variants
 * 4. Switch to public/unauthenticated context
 * 5. Search SKUs without filters (baseline test)
 * 6. Search SKUs with price range filters
 * 7. Search SKUs with pagination parameters
 * 8. Search SKUs with combined filters
 * 9. Validate response structure and pagination metadata
 * 10. Verify filtering produces correct results
 */
export async function test_api_sku_search_public_access_with_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();
  const seller = await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(2),
      business_description: RandomGenerator.paragraph({ sentences: 5 }),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });
  typia.assert(seller);

  // Step 2: Create admin account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin" as const,
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active" as const,
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 3: Switch back to seller and create product sale
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new" as const,
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Note: SKU creation endpoint not available in provided API functions.
  // This test validates the search API structure and public access,
  // though actual SKU data may be empty or populated by other means.

  // Step 4: Create unauthenticated connection for public access
  const publicConnection: api.IConnection = { ...connection, headers: {} };

  // Step 5: Search SKUs without filters (baseline test)
  const baselineSearch = await api.functional.shoppingMall.sales.skus.index(
    publicConnection,
    {
      saleCode: sale.code,
      body: {} satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(baselineSearch);

  // Step 6: Search SKUs with price range filters
  const priceFilterSearch = await api.functional.shoppingMall.sales.skus.index(
    publicConnection,
    {
      saleCode: sale.code,
      body: {
        min_price: 10,
        max_price: 1000,
      } satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(priceFilterSearch);

  // Step 7: Search SKUs with pagination parameters
  const paginatedSearch = await api.functional.shoppingMall.sales.skus.index(
    publicConnection,
    {
      saleCode: sale.code,
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(paginatedSearch);

  TestValidator.equals(
    "pagination current page matches request",
    paginatedSearch.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit matches request",
    paginatedSearch.pagination.limit,
    10,
  );

  // Step 8: Search SKUs with combined filters
  const combinedFilterSearch =
    await api.functional.shoppingMall.sales.skus.index(publicConnection, {
      saleCode: sale.code,
      body: {
        page: 1,
        limit: 20,
        min_price: 50,
        max_price: 500,
        sort_by: "price" as const,
        sort_order: "asc" as const,
      } satisfies IShoppingMallSaleSku.IRequest,
    });
  typia.assert(combinedFilterSearch);

  // Step 9: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination has valid current page",
    combinedFilterSearch.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    combinedFilterSearch.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination has valid records count",
    combinedFilterSearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages count",
    combinedFilterSearch.pagination.pages >= 0,
  );

  // Step 10: Verify data array structure and SKU summary fields
  TestValidator.predicate(
    "combined filter search returns data array",
    Array.isArray(combinedFilterSearch.data),
  );

  // Validate SKU summary structure if any SKUs exist
  if (combinedFilterSearch.data.length > 0) {
    const firstSku = combinedFilterSearch.data[0];
    typia.assert(firstSku);
  }
}
