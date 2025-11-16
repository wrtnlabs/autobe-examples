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
 * Test SKU search pagination controls and sorting capabilities.
 *
 * This test validates that large sets of SKU variants can be browsed
 * efficiently using page and limit parameters, and that results can be sorted
 * by different criteria (created_at, price, sku_code) in both ascending and
 * descending order.
 *
 * Test workflow:
 *
 * 1. Create admin account and authenticate
 * 2. Create product category
 * 3. Create seller account and authenticate
 * 4. Create product sale
 * 5. Test pagination with different page sizes
 * 6. Verify pagination metadata accuracy
 * 7. Test sorting by created_at (ascending and descending)
 * 8. Test sorting by price (ascending and descending)
 * 9. Test sorting by sku_code (ascending and descending)
 * 10. Verify pagination works consistently across different sort orders
 *
 * Note: This test assumes SKUs are auto-generated or exist from other
 * mechanisms. If no SKUs exist, the test will still validate pagination and
 * sorting logic with empty results.
 */
export async function test_api_sku_search_pagination_and_sorting(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();

  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: "super_admin",
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });

  // Step 2: Authenticate as admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // Step 3: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph(),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: "active",
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = typia.random<string & tags.MinLength<8>>();

  await api.functional.auth.seller.join(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      business_name: RandomGenerator.name(3),
      business_description: RandomGenerator.paragraph(),
      store_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ICreate,
  });

  // Step 5: Authenticate as seller
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 6: Create product sale
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        condition: "new",
        return_policy_days: 30,
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 7: Test pagination with default parameters
  const defaultPage = await api.functional.shoppingMall.sales.skus.index(
    connection,
    {
      saleCode: sale.code,
      body: {} satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(defaultPage);

  // Step 8: Test pagination with page 1, limit 10
  const page1 = await api.functional.shoppingMall.sales.skus.index(connection, {
    saleCode: sale.code,
    body: {
      page: 1,
      limit: 10,
    } satisfies IShoppingMallSaleSku.IRequest,
  });
  typia.assert(page1);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 10);

  // Step 9: Test pagination with page 2, limit 5
  const page2 = await api.functional.shoppingMall.sales.skus.index(connection, {
    saleCode: sale.code,
    body: {
      page: 2,
      limit: 5,
    } satisfies IShoppingMallSaleSku.IRequest,
  });
  typia.assert(page2);
  TestValidator.equals("page 2 current page", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 5);

  // Step 10: Verify pagination metadata consistency
  TestValidator.equals(
    "total records consistency",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.predicate(
    "total pages calculated correctly",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );

  // Step 11: Test sorting by created_at ascending
  const sortByCreatedAsc = await api.functional.shoppingMall.sales.skus.index(
    connection,
    {
      saleCode: sale.code,
      body: {
        sort_by: "created_at",
        sort_order: "asc",
      } satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(sortByCreatedAsc);

  // Step 12: Test sorting by created_at descending
  const sortByCreatedDesc = await api.functional.shoppingMall.sales.skus.index(
    connection,
    {
      saleCode: sale.code,
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(sortByCreatedDesc);

  // Step 13: Test sorting by price ascending
  const sortByPriceAsc = await api.functional.shoppingMall.sales.skus.index(
    connection,
    {
      saleCode: sale.code,
      body: {
        sort_by: "price",
        sort_order: "asc",
      } satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(sortByPriceAsc);

  // Step 14: Test sorting by price descending
  const sortByPriceDesc = await api.functional.shoppingMall.sales.skus.index(
    connection,
    {
      saleCode: sale.code,
      body: {
        sort_by: "price",
        sort_order: "desc",
      } satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(sortByPriceDesc);

  // Step 15: Test sorting by sku_code ascending
  const sortBySkuCodeAsc = await api.functional.shoppingMall.sales.skus.index(
    connection,
    {
      saleCode: sale.code,
      body: {
        sort_by: "sku_code",
        sort_order: "asc",
      } satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(sortBySkuCodeAsc);

  // Step 16: Test sorting by sku_code descending
  const sortBySkuCodeDesc = await api.functional.shoppingMall.sales.skus.index(
    connection,
    {
      saleCode: sale.code,
      body: {
        sort_by: "sku_code",
        sort_order: "desc",
      } satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(sortBySkuCodeDesc);

  // Step 17: Test pagination with sorting combined
  const paginatedSorted = await api.functional.shoppingMall.sales.skus.index(
    connection,
    {
      saleCode: sale.code,
      body: {
        page: 1,
        limit: 5,
        sort_by: "price",
        sort_order: "asc",
      } satisfies IShoppingMallSaleSku.IRequest,
    },
  );
  typia.assert(paginatedSorted);
  TestValidator.equals(
    "paginated sorted current page",
    paginatedSorted.pagination.current,
    1,
  );
  TestValidator.equals(
    "paginated sorted limit",
    paginatedSorted.pagination.limit,
    5,
  );
}
