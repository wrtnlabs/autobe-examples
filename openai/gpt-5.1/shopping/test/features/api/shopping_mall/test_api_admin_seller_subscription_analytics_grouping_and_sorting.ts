import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAnalyticsDateRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsDateRange";
import type { IAnalyticsPagination } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsPagination";
import type { IAnalyticsSort } from "@ORGANIZATION/PROJECT-api/lib/structures/IAnalyticsSort";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerSubscription";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscription";
import type { IShoppingMallSellerSubscriptionAnalyticsPlanBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionAnalyticsPlanBreakdown";
import type { IShoppingMallSellerSubscriptionAnalyticsStatusBreakdown } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionAnalyticsStatusBreakdown";
import type { IShoppingMallSellerSubscriptionPlan } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSubscriptionPlan";

/**
 * Validate grouping, sorting, and pagination behavior of seller subscription
 * analytics for admin users.
 *
 * Business context:
 *
 * - Admin users analyze seller subscription performance via PATCH
 *   /shoppingMall/admin/analytics/sellerSubscriptions.
 * - They can group results by time and plan, choose metrics, and sort by a
 *   revenue-related metric.
 * - Pagination must be deterministic and stable when the same query is repeated.
 *
 * This test performs the following high-level steps:
 *
 * 1. Join an admin account to obtain an authenticated context.
 * 2. Build a multi-month analytics request with group_by ["month", "plan"],
 *    multiple metrics, small pagination (size=5), and descending sort on a
 *    revenue metric key.
 * 3. Call the analytics endpoint and assert basic type safety using typia.assert.
 * 4. When at least two rows are returned, verify that the chosen metric is
 *    monotonically non-increasing under descending sort.
 * 5. Repeat the exact same request to confirm deterministic pagination metadata
 *    and stable ordering.
 * 6. Change the sort direction to ascending (asc) for the same metric and verify
 *    non-decreasing order when at least two rows are returned.
 * 7. If metric values are not all identical, ensure that ascending sort produces a
 *    different order than descending sort, proving that sort direction is
 *    respected.
 * 8. Optionally, when multiple pages exist, request page 2 and confirm pagination
 *    metadata and that page 1 and page 2 data arrays are not deeply equal,
 *    indicating proper page separation.
 */
export async function test_api_admin_seller_subscription_analytics_grouping_and_sorting(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain authenticated context
  const adminJoinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Prepare common analytics request parameters
  const now = new Date();
  const threeMonthsAgo = new Date(now.getTime());
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const dateRange: IAnalyticsDateRange = {
    from: threeMonthsAgo.toISOString(),
    to: now.toISOString(),
  };

  const pagination: IAnalyticsPagination = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    size: 5 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };

  const metricField = "total_net_subscription_revenue_amount";

  const commonRequestBody: IShoppingMallSellerSubscription.IRequest = {
    date_range: dateRange,
    date_range_type: "started_at",
    group_by: ["month", "plan"],
    metrics: [
      "total_active_subscriptions",
      "total_new_subscriptions",
      metricField,
    ],
    pagination,
  };

  // 3. First analytics call with descending sort
  const sortsDesc: IAnalyticsSort[] = [
    {
      field: metricField,
      direction: "desc",
    },
  ];

  const descRequestBody: IShoppingMallSellerSubscription.IRequest = {
    ...commonRequestBody,
    sorts: sortsDesc,
  };

  const descPage: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerSubscriptions.index(
      connection,
      {
        body: descRequestBody,
      },
    );
  typia.assert(descPage);

  const descData: IShoppingMallSellerSubscription.ISummary[] = descPage.data;

  // 4. Validate descending ordering on metric when possible
  if (descData.length >= 2) {
    const descMetricValues = descData.map(
      (row) => row.total_net_subscription_revenue_amount,
    );

    const isNonIncreasing = descMetricValues.every((value, index, array) => {
      if (index === 0) return true;
      const previous = array[index - 1];
      return previous >= value;
    });

    TestValidator.predicate(
      "seller subscription analytics: metric should be non-increasing under desc sort",
      isNonIncreasing,
    );
  }

  // 5. Repeat same request to confirm deterministic pagination and ordering
  const descPageAgain: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerSubscriptions.index(
      connection,
      {
        body: descRequestBody,
      },
    );
  typia.assert(descPageAgain);

  TestValidator.equals(
    "seller subscription analytics: pagination metadata should be stable across identical desc requests",
    descPageAgain.pagination,
    descPage.pagination,
  );

  TestValidator.equals(
    "seller subscription analytics: data rows should be stable across identical desc requests",
    descPageAgain.data,
    descPage.data,
  );

  // 6. Second analytics call with ascending sort
  const sortsAsc: IAnalyticsSort[] = [
    {
      field: metricField,
      direction: "asc",
    },
  ];

  const ascRequestBody: IShoppingMallSellerSubscription.IRequest = {
    ...commonRequestBody,
    sorts: sortsAsc,
  };

  const ascPage: IPageIShoppingMallSellerSubscription.ISummary =
    await api.functional.shoppingMall.admin.analytics.sellerSubscriptions.index(
      connection,
      {
        body: ascRequestBody,
      },
    );
  typia.assert(ascPage);

  const ascData: IShoppingMallSellerSubscription.ISummary[] = ascPage.data;

  if (ascData.length >= 2) {
    const ascMetricValues = ascData.map(
      (row) => row.total_net_subscription_revenue_amount,
    );

    const isNonDecreasing = ascMetricValues.every((value, index, array) => {
      if (index === 0) return true;
      const previous = array[index - 1];
      return previous <= value;
    });

    TestValidator.predicate(
      "seller subscription analytics: metric should be non-decreasing under asc sort",
      isNonDecreasing,
    );

    // 7. Compare asc vs desc ordering when metric values are not all identical
    if (descData.length === ascData.length) {
      const descMetricValues = descData.map(
        (row) => row.total_net_subscription_revenue_amount,
      );

      const allEqual = descMetricValues.every(
        (value) => value === descMetricValues[0],
      );

      if (!allEqual) {
        TestValidator.notEquals(
          "seller subscription analytics: metric order should differ between desc and asc sorts when values vary",
          descMetricValues,
          ascMetricValues,
        );
      }
    }
  }

  // 8. Optional: pagination sanity check for second page under desc sort
  const pageSize = descPage.pagination.limit;
  const totalRecords = descPage.pagination.records;
  const totalPages = descPage.pagination.pages;

  if (pageSize > 0 && totalPages > 1 && totalRecords > pageSize) {
    const paginationPage2: IAnalyticsPagination = {
      page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
      size: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    };

    const page2RequestBody: IShoppingMallSellerSubscription.IRequest = {
      ...commonRequestBody,
      pagination: paginationPage2,
      sorts: sortsDesc,
    };

    const page2: IPageIShoppingMallSellerSubscription.ISummary =
      await api.functional.shoppingMall.admin.analytics.sellerSubscriptions.index(
        connection,
        {
          body: page2RequestBody,
        },
      );
    typia.assert(page2);

    TestValidator.equals(
      "seller subscription analytics: second page pagination current should be 2",
      page2.pagination.current,
      2,
    );

    if (page2.data.length > 0) {
      TestValidator.notEquals(
        "seller subscription analytics: page 1 and page 2 data arrays should not be deeply equal when multiple pages exist",
        descPage.data,
        page2.data,
      );
    }
  }
}
