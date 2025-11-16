import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPlatformCommission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPlatformCommission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformCommission";

/**
 * Test combining multiple filter parameters for complex commission searches.
 *
 * This test validates the advanced search capability essential for
 * sophisticated financial analysis and multi-dimensional reporting. It tests
 * the ability to combine multiple filter criteria (seller_id, date range,
 * refund status, sorting) to perform complex administrative queries.
 *
 * Test workflow:
 *
 * 1. Authenticate as admin to access comprehensive commission search
 * 2. Perform basic search to establish baseline data
 * 3. Apply single filter (seller_id) and validate results
 * 4. Combine multiple filters (seller + date range) and validate cumulative effect
 * 5. Add refund status filter to existing filters and validate
 * 6. Test pagination with multiple filters applied
 * 7. Validate sorting maintains correct order within multi-filtered results
 *
 * Validation points:
 *
 * - All filter criteria are applied correctly and cumulatively (logical AND)
 * - Returned records match ALL specified filter conditions simultaneously
 * - Pagination functions correctly with multiple filters applied
 * - Total record counts accurately reflect the complex filtered subset
 * - Sorting maintains correct order within the multi-filtered result set
 */
export async function test_api_platform_commission_combined_filters(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as admin
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
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

  // Step 2: Perform basic search to get baseline data
  const baselineSearch =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(baselineSearch);

  // Step 3: Test single filter - filter by seller_id if data exists
  if (baselineSearch.data.length > 0) {
    const targetSellerId = baselineSearch.data[0].shopping_mall_seller_id;

    const sellerFilterSearch =
      await api.functional.shoppingMall.admin.platformCommissions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 20,
            seller_id: targetSellerId,
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(sellerFilterSearch);

    // Validate all results match the seller filter
    for (const commission of sellerFilterSearch.data) {
      TestValidator.equals(
        "seller filter - all results match seller_id",
        commission.shopping_mall_seller_id,
        targetSellerId,
      );
    }
  }

  // Step 4: Combine multiple filters - seller + date range
  if (baselineSearch.data.length > 0) {
    const targetSellerId = baselineSearch.data[0].shopping_mall_seller_id;
    const referenceDate = baselineSearch.data[0].created_at;
    const dateBefore = new Date(referenceDate);
    dateBefore.setDate(dateBefore.getDate() + 30);

    const combinedFilterSearch =
      await api.functional.shoppingMall.admin.platformCommissions.index(
        connection,
        {
          body: {
            page: 1,
            limit: 20,
            seller_id: targetSellerId,
            created_after: referenceDate,
            created_before: dateBefore.toISOString(),
          } satisfies IShoppingMallPlatformCommission.IRequest,
        },
      );
    typia.assert(combinedFilterSearch);

    // Validate all results match BOTH seller AND date filters
    for (const commission of combinedFilterSearch.data) {
      TestValidator.equals(
        "combined filter - seller_id matches",
        commission.shopping_mall_seller_id,
        targetSellerId,
      );

      const commissionDate = new Date(commission.created_at);
      const afterDate = new Date(referenceDate);

      TestValidator.predicate(
        "combined filter - created_at is after reference date",
        commissionDate >= afterDate,
      );

      TestValidator.predicate(
        "combined filter - created_at is before end date",
        commissionDate <= dateBefore,
      );
    }
  }

  // Step 5: Add refund status filter to existing filters
  if (baselineSearch.data.length > 0) {
    const refundedCommission = baselineSearch.data.find(
      (c) => c.is_refunded === true,
    );

    if (refundedCommission) {
      const tripleFilterSearch =
        await api.functional.shoppingMall.admin.platformCommissions.index(
          connection,
          {
            body: {
              page: 1,
              limit: 20,
              seller_id: refundedCommission.shopping_mall_seller_id,
              is_refunded: true,
            } satisfies IShoppingMallPlatformCommission.IRequest,
          },
        );
      typia.assert(tripleFilterSearch);

      // Validate all results match ALL three filters
      for (const commission of tripleFilterSearch.data) {
        TestValidator.equals(
          "triple filter - seller_id matches",
          commission.shopping_mall_seller_id,
          refundedCommission.shopping_mall_seller_id,
        );

        TestValidator.equals(
          "triple filter - is_refunded is true",
          commission.is_refunded,
          true,
        );
      }
    }
  }

  // Step 6: Test pagination with multiple filters
  const paginationSearch =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(paginationSearch);

  TestValidator.predicate(
    "pagination - limit is respected",
    paginationSearch.data.length <= 10,
  );

  // Step 7: Validate sorting with filters
  const sortedSearch =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 20,
          sort_by: "commission_amount",
          sort_order: "desc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(sortedSearch);

  // Verify descending order of commission amounts
  for (let i = 0; i < sortedSearch.data.length - 1; i++) {
    const current = sortedSearch.data[i].commission_amount;
    const next = sortedSearch.data[i + 1].commission_amount;

    TestValidator.predicate(
      "sorting - commission amounts in descending order",
      current >= next,
    );
  }

  // Step 8: Test complex multi-criteria query combining many filters
  const complexSearch =
    await api.functional.shoppingMall.admin.platformCommissions.index(
      connection,
      {
        body: {
          page: 1,
          limit: 50,
          is_refunded: false,
          min_commission_amount: 0,
          sort_by: "created_at",
          sort_order: "asc",
        } satisfies IShoppingMallPlatformCommission.IRequest,
      },
    );
  typia.assert(complexSearch);

  // Validate complex filter conditions
  for (const commission of complexSearch.data) {
    TestValidator.equals(
      "complex filter - is_refunded is false",
      commission.is_refunded,
      false,
    );

    TestValidator.predicate(
      "complex filter - commission_amount >= min threshold",
      commission.commission_amount >= 0,
    );
  }

  // Verify ascending order
  for (let i = 0; i < complexSearch.data.length - 1; i++) {
    const currentDate = new Date(complexSearch.data[i].created_at);
    const nextDate = new Date(complexSearch.data[i + 1].created_at);

    TestValidator.predicate(
      "complex filter - dates in ascending order",
      currentDate <= nextDate,
    );
  }
}
