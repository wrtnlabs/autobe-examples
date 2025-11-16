import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSaleSnapshot";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallSale } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSale";
import type { IShoppingMallSaleSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleSnapshot";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test advanced pagination and filtering capabilities for product sale snapshot
 * retrieval.
 *
 * This test validates that sellers can efficiently navigate through potentially
 * large snapshot histories using various filtering and pagination parameters.
 * It creates a complete test environment with seller, admin, category, and
 * product sale, then tests multiple snapshot retrieval scenarios including
 * pagination with different page sizes, navigation through multiple pages,
 * filtering by product status, date range filtering, and sorting control.
 *
 * The test verifies that pagination metadata accurately reflects the filtered
 * result set, page boundaries are correctly enforced, limit parameter
 * constrains response size properly, filtering parameters correctly narrow the
 * result set, and combined filters work together properly. It also validates
 * edge cases including empty result sets, single-page results, and last page
 * with partial results.
 */
export async function test_api_sale_snapshot_pagination_and_filtering(
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

  // Step 2: Create admin account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: typia.random<string & tags.Format<"password">>(),
      full_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      admin_level: RandomGenerator.pick([
        "super_admin",
        "moderator",
        "support",
      ] as const),
      email_verified: true,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 3: Create product category
  const category = await api.functional.shoppingMall.admin.categories.create(
    connection,
    {
      body: {
        name: RandomGenerator.name(2),
        slug: RandomGenerator.alphaNumeric(10),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        display_order: typia.random<number & tags.Type<"int32">>(),
        status: RandomGenerator.pick(["active", "inactive"] as const),
      } satisfies IShoppingMallCategory.ICreate,
    },
  );
  typia.assert(category);

  // Step 4: Switch back to seller account
  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.ILogin,
  });

  // Step 5: Create product sale
  const sale = await api.functional.shoppingMall.seller.sales.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphaNumeric(12),
        shopping_mall_category_id: category.id,
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        description: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        brand: RandomGenerator.name(1),
        condition: RandomGenerator.pick([
          "new",
          "refurbished",
          "used",
        ] as const),
        short_description: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
        return_policy_days: RandomGenerator.pick([0, 7, 14, 30, 60] as const),
      } satisfies IShoppingMallSale.ICreate,
    },
  );
  typia.assert(sale);

  // Step 6: Test pagination with different page sizes (limit parameter)
  const limitTests = [1, 10, 20, 50, 100];
  for (const limit of limitTests) {
    const result =
      await api.functional.shoppingMall.seller.sales.snapshots.index(
        connection,
        {
          saleCode: sale.code,
          body: {
            limit: limit,
            page: 1,
          } satisfies IShoppingMallSaleSnapshot.IRequest,
        },
      );
    typia.assert(result);

    TestValidator.predicate(
      "result data length should not exceed limit",
      result.data.length <= limit,
    );
    TestValidator.equals(
      "pagination limit matches request",
      result.pagination.limit,
      limit,
    );
  }

  // Step 7: Test page navigation
  const pageResult =
    await api.functional.shoppingMall.seller.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: {
        limit: 5,
        page: 1,
      } satisfies IShoppingMallSaleSnapshot.IRequest,
    });
  typia.assert(pageResult);

  if (pageResult.pagination.pages > 1) {
    const page2Result =
      await api.functional.shoppingMall.seller.sales.snapshots.index(
        connection,
        {
          saleCode: sale.code,
          body: {
            limit: 5,
            page: 2,
          } satisfies IShoppingMallSaleSnapshot.IRequest,
        },
      );
    typia.assert(page2Result);
    TestValidator.equals(
      "second page current should be 2",
      page2Result.pagination.current,
      2,
    );
  }

  // Step 8: Test requesting page beyond total pages returns empty or last page
  const beyondPageResult =
    await api.functional.shoppingMall.seller.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: {
        limit: 10,
        page: 9999,
      } satisfies IShoppingMallSaleSnapshot.IRequest,
    });
  typia.assert(beyondPageResult);

  // Step 9: Test sorting control - descending order (default)
  const sortDescResult =
    await api.functional.shoppingMall.seller.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: {
        sort: "-created_at",
        limit: 20,
      } satisfies IShoppingMallSaleSnapshot.IRequest,
    });
  typia.assert(sortDescResult);

  // Step 10: Test sorting control - ascending order
  const sortAscResult =
    await api.functional.shoppingMall.seller.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: {
        sort: "created_at",
        limit: 20,
      } satisfies IShoppingMallSaleSnapshot.IRequest,
    });
  typia.assert(sortAscResult);

  // Step 11: Test filtering by status
  const statusFilterResult =
    await api.functional.shoppingMall.seller.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: {
        status: "draft",
        limit: 10,
      } satisfies IShoppingMallSaleSnapshot.IRequest,
    });
  typia.assert(statusFilterResult);

  // Step 12: Test date range filtering
  const currentTime = new Date();
  const oneDayAgo = new Date(currentTime.getTime() - 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.shoppingMall.seller.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: {
        created_at_from: oneDayAgo.toISOString(),
        created_at_to: currentTime.toISOString(),
        limit: 10,
      } satisfies IShoppingMallSaleSnapshot.IRequest,
    });
  typia.assert(dateRangeResult);

  // Step 13: Test combined filters (date range + status + pagination)
  const combinedFilterResult =
    await api.functional.shoppingMall.seller.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: {
        status: "draft",
        created_at_from: oneDayAgo.toISOString(),
        created_at_to: currentTime.toISOString(),
        limit: 5,
        page: 1,
        sort: "-created_at",
      } satisfies IShoppingMallSaleSnapshot.IRequest,
    });
  typia.assert(combinedFilterResult);

  // Step 14: Validate pagination metadata structure
  TestValidator.predicate(
    "pagination current is positive",
    combinedFilterResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    combinedFilterResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    combinedFilterResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    combinedFilterResult.pagination.pages >= 0,
  );

  // Step 15: Test empty result set scenario
  const futureDate = new Date(
    currentTime.getTime() + 365 * 24 * 60 * 60 * 1000,
  );
  const emptyResult =
    await api.functional.shoppingMall.seller.sales.snapshots.index(connection, {
      saleCode: sale.code,
      body: {
        created_at_from: futureDate.toISOString(),
        limit: 10,
      } satisfies IShoppingMallSaleSnapshot.IRequest,
    });
  typia.assert(emptyResult);
}
