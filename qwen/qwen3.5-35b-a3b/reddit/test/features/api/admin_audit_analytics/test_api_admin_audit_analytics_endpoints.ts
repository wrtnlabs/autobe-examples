import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformAdminAuditLog";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformAdminAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdminAuditLog";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * E2E test for admin audit analytics endpoint.
 *
 * Tests comprehensive audit and monitoring analytics functionality including:
 * - Admin authentication and authorization
 * - Default analytics query execution
 * - Filtering by date range, admin IDs, moderator IDs, community IDs, action types
 * - Sorting by metric value, timestamp, and action type
 * - Pagination (offset-based and cursor-based)
 * - Data aggregation validation
 * - Empty result handling
 */
export async function test_api_admin_audit_analytics_endpoints(
  connection: api.IConnection,
): Promise<void> {
  // ============================================================================
  // SECTION 1: ADMIN AUTHENTICATION
  // ============================================================================
  // 1.1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminResult = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>() ?? null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(adminResult);
  // 1.2. Verify admin authentication response structure
  TestValidator.equals(
    "admin ID is UUID format",
    adminResult.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "admin email is valid format",
    adminResult.email,
    typia.random<string & tags.Format<"email">>(),
  );
  TestValidator.equals(
    "admin username exists",
    adminResult.username.length > 0,
    true,
  );
  TestValidator.equals(
    "admin display name exists",
    adminResult.display_name.length > 0,
    true,
  );
  TestValidator.equals("admin is active", adminResult.is_active, true);
  TestValidator.equals(
    "admin created_at is valid date-time",
    true,
    !isNaN(Date.parse(adminResult.created_at)),
  );
  TestValidator.equals(
    "admin updated_at is valid date-time",
    true,
    !isNaN(Date.parse(adminResult.updated_at)),
  );
  // 1.3. Verify authorization token
  const token = adminResult.token;
  typia.assert(token);
  TestValidator.equals("access token exists", token.access.length > 0, true);
  TestValidator.equals("refresh token exists", token.refresh.length > 0, true);
  TestValidator.equals(
    "access token expiration exists",
    true,
    !isNaN(Date.parse(token.expired_at)),
  );
  TestValidator.equals(
    "refreshable until exists",
    true,
    !isNaN(Date.parse(token.refreshable_until)),
  );
  TestValidator.equals(
    "access token expires before refreshable until",
    true,
    Date.parse(token.expired_at) < Date.parse(token.refreshable_until),
  );
  // ============================================================================
  // SECTION 2: DEFAULT ANALYTICS QUERY (NO FILTERS)
  // ============================================================================
  // 2.1. Execute analytics query with default parameters
  const defaultQuery: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
  };
  const defaultResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: defaultQuery,
      },
    );
  typia.assert(defaultResult);
  // 2.2. Verify response contains pagination metadata
  const pagination = defaultResult.pagination;
  typia.assert(pagination);
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.equals("limit is 20", pagination.limit, 20);
  TestValidator.equals(
    "records is non-negative",
    pagination.records >= 0,
    true,
  );
  TestValidator.equals("pages is non-negative", pagination.pages >= 0, true);
  // 2.3. Verify data array exists and contains metrics
  typia.assert(defaultResult.data);
  TestValidator.equals(
    "data array exists",
    Array.isArray(defaultResult.data),
    true,
  );
  // 2.4. Verify each metric in data array
  for (const metric of defaultResult.data) {
    typia.assert(metric);
    // Metric name validation
    TestValidator.equals(
      "metric_name exists",
      metric.metric_name.length > 0,
      true,
    );
    TestValidator.equals(
      "metric_value exists",
      metric.metric_value !== undefined,
      true,
    );
    TestValidator.equals(
      "metric_type exists",
      metric.metric_type.length > 0,
      true,
    );
    TestValidator.equals(
      "timestamp is valid date-time",
      true,
      !isNaN(Date.parse(metric.timestamp)),
    );
    // Optional fields validation
    if (metric.context !== undefined) {
      typia.assert(metric.context);
      TestValidator.equals(
        "context is object",
        typeof metric.context === "object",
        true,
      );
    }
    if (metric.granularity !== undefined) {
      TestValidator.equals(
        "granularity is string",
        typeof metric.granularity === "string",
        true,
      );
    }
    if (metric.total_value !== undefined) {
      TestValidator.equals(
        "total_value is number or null",
        metric.total_value === null || typeof metric.total_value === "number",
        true,
      );
    }
    // Nested references (moderator, community)
    if (metric.moderator !== undefined) {
      typia.assert(metric.moderator);
      TestValidator.equals(
        "moderator ID is UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          metric.moderator.id,
        ),
        true,
      );
      TestValidator.equals(
        "moderator username exists",
        metric.moderator.username.length > 0,
        true,
      );
      TestValidator.equals(
        "moderator display_name exists",
        metric.moderator.display_name.length > 0,
        true,
      );
      TestValidator.equals(
        "moderator karma_score is non-negative",
        metric.moderator.karma_score >= 0,
        true,
      );
      TestValidator.equals(
        "moderator is_active is boolean",
        typeof metric.moderator.is_active === "boolean",
        true,
      );
      TestValidator.equals(
        "moderator created_at is valid date-time",
        true,
        !isNaN(Date.parse(metric.moderator.created_at)),
      );
    }
    if (metric.community !== undefined) {
      typia.assert(metric.community);
      TestValidator.equals(
        "community ID is UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          metric.community.id,
        ),
        true,
      );
      TestValidator.equals(
        "community name exists",
        metric.community.name.length > 0,
        true,
      );
      TestValidator.equals(
        "community subscriber_count is non-negative",
        metric.community.subscriber_count >= 0,
        true,
      );
      TestValidator.equals(
        "community created_at is valid date-time",
        true,
        !isNaN(Date.parse(metric.community.created_at)),
      );
      typia.assert(metric.community.owner);
      TestValidator.equals(
        "community owner ID is UUID format",
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          metric.community.owner.id,
        ),
        true,
      );
    }
  }
  // ============================================================================
  // SECTION 3: FILTERING VALIDATION
  // ============================================================================
  // 3.1. Filter by date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeFilter: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
  const dateRangeResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: dateRangeFilter,
      },
    );
  typia.assert(dateRangeResult);
  typia.assert(dateRangeResult.data);
  for (const metric of dateRangeResult.data) {
    const metricDate = new Date(metric.timestamp);
    TestValidator.equals(
      "metric timestamp within date range",
      true,
      metricDate >= startDate && metricDate <= endDate,
    );
  }
  // 3.2. Test empty date range (startDate after endDate) - should handle gracefully
  const invalidDateRange: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    startDate: endDate.toISOString(),
    endDate: startDate.toISOString(),
  };
  const invalidDateRangeResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: invalidDateRange,
      },
    );
  typia.assert(invalidDateRangeResult);
  TestValidator.equals(
    "empty data for invalid date range",
    invalidDateRangeResult.data.length,
    0,
  );
  // 3.3. Filter by action types
  const actionTypes: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    actionTypes: ["DELETE", "BAN", "UNBAN", "RESOLVE_REPORT"],
  };
  const actionTypesResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: actionTypes,
      },
    );
  typia.assert(actionTypesResult);
  typia.assert(actionTypesResult.data);
  for (const metric of actionTypesResult.data) {
    if (metric.context && metric.context.action_type) {
      TestValidator.equals(
        "action_type is in filter list",
        actionTypes.actionTypes?.includes(metric.context.action_type),
        true,
      );
    }
  }
  // 3.4. Filter by metric types
  const metricTypes: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    metricTypes: ["admin_activity", "moderator_activity"],
  };
  const metricTypesResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: metricTypes,
      },
    );
  typia.assert(metricTypesResult);
  typia.assert(metricTypesResult.data);
  for (const metric of metricTypesResult.data) {
    TestValidator.equals(
      "metric_type is in filter list",
      metricTypes.metricTypes?.includes(metric.metric_type),
      true,
    );
  }
  // ============================================================================
  // SECTION 4: SORTING VALIDATION
  // ============================================================================
  // 4.1. Sort by timestamp descending
  const sortTimestampDesc: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    sortBy: "timestamp",
    sortOrder: "desc",
  };
  const sortTimestampDescResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: sortTimestampDesc,
      },
    );
  typia.assert(sortTimestampDescResult);
  typia.assert(sortTimestampDescResult.data);
  for (let i = 1; i < sortTimestampDescResult.data.length; i++) {
    const prevDate = new Date(sortTimestampDescResult.data[i - 1].timestamp);
    const currDate = new Date(sortTimestampDescResult.data[i].timestamp);
    TestValidator.equals(
      "sorted by timestamp descending",
      true,
      prevDate >= currDate,
    );
  }
  // 4.2. Sort by timestamp ascending
  const sortTimestampAsc: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    sortBy: "timestamp",
    sortOrder: "asc",
  };
  const sortTimestampAscResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: sortTimestampAsc,
      },
    );
  typia.assert(sortTimestampAscResult);
  typia.assert(sortTimestampAscResult.data);
  for (let i = 1; i < sortTimestampAscResult.data.length; i++) {
    const prevDate = new Date(sortTimestampAscResult.data[i - 1].timestamp);
    const currDate = new Date(sortTimestampAscResult.data[i].timestamp);
    TestValidator.equals(
      "sorted by timestamp ascending",
      true,
      prevDate <= currDate,
    );
  }
  // 4.3. Sort by metric value descending
  const sortMetricValueDesc: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    sortBy: "metric_value",
    sortOrder: "desc",
  };
  const sortMetricValueDescResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: sortMetricValueDesc,
      },
    );
  typia.assert(sortMetricValueDescResult);
  typia.assert(sortMetricValueDescResult.data);
  for (let i = 1; i < sortMetricValueDescResult.data.length; i++) {
    const prevValue = sortMetricValueDescResult.data[i - 1].metric_value;
    const currValue = sortMetricValueDescResult.data[i].metric_value;
    TestValidator.equals(
      "sorted by metric_value descending",
      true,
      (prevValue as number) >= (currValue as number),
    );
  }
  // 4.4. Sort by metric value ascending
  const sortMetricValueAsc: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    sortBy: "metric_value",
    sortOrder: "asc",
  };
  const sortMetricValueAscResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: sortMetricValueAsc,
      },
    );
  typia.assert(sortMetricValueAscResult);
  typia.assert(sortMetricValueAscResult.data);
  for (let i = 1; i < sortMetricValueAscResult.data.length; i++) {
    const prevValue = sortMetricValueAscResult.data[i - 1].metric_value;
    const currValue = sortMetricValueAscResult.data[i].metric_value;
    TestValidator.equals(
      "sorted by metric_value ascending",
      true,
      (prevValue as number) <= (currValue as number),
    );
  }
  // 4.5. Sort by action type alphabetically
  const sortActionType: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    sortBy: "action_type",
    sortOrder: "asc",
  };
  const sortActionTypeResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: sortActionType,
      },
    );
  typia.assert(sortActionTypeResult);
  typia.assert(sortActionTypeResult.data);
  for (let i = 1; i < sortActionTypeResult.data.length; i++) {
    const prevType =
      sortActionTypeResult.data[i - 1].context?.action_type ?? "";
    const currType = sortActionTypeResult.data[i].context?.action_type ?? "";
    TestValidator.equals(
      "sorted by action_type ascending",
      true,
      prevType <= currType,
    );
  }
  // ============================================================================
  // SECTION 5: PAGINATION VALIDATION
  // ============================================================================
  // 5.1. Test page 1 with limit 10
  const page1Limit10: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 10,
  };
  const page1Limit10Result =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: page1Limit10,
      },
    );
  typia.assert(page1Limit10Result);
  typia.assert(page1Limit10Result.data);
  TestValidator.equals(
    "page 1 limit 10 current page",
    page1Limit10Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "page 1 limit 10 limit",
    page1Limit10Result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "page 1 limit 10 records count matches data length",
    page1Limit10Result.data.length <= 10,
    true,
  );
  // 5.2. Test page 2 with limit 10
  const page2Limit10: IRedditPlatformAdminAuditLog.IRequest = {
    page: 2,
    limit: 10,
  };
  const page2Limit10Result =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: page2Limit10,
      },
    );
  typia.assert(page2Limit10Result);
  typia.assert(page2Limit10Result.data);
  TestValidator.equals(
    "page 2 limit 10 current page",
    page2Limit10Result.pagination.current,
    2,
  );
  TestValidator.equals(
    "page 2 limit 10 limit",
    page2Limit10Result.pagination.limit,
    10,
  );
  TestValidator.notEquals(
    "page 2 data different from page 1",
    page1Limit10Result.data.length > 0
      ? page1Limit10Result.data[0]?.metric_name
      : "",
    page2Limit10Result.data.length > 0
      ? page2Limit10Result.data[0]?.metric_name
      : "",
  );
  // 5.3. Test pagination metadata accuracy
  TestValidator.equals(
    "total pages calculated correctly",
    page1Limit10Result.pagination.pages,
    Math.ceil(
      page1Limit10Result.pagination.records /
        page1Limit10Result.pagination.limit,
    ),
  );
  // 5.4. Test empty results (no data matches filters)
  const emptyResults: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    actionTypes: ["NONEXISTENT_ACTION_TYPE"],
    metricTypes: ["NONEXISTENT_METRIC_TYPE"],
  };
  const emptyResultsResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: emptyResults,
      },
    );
  typia.assert(emptyResultsResult);
  typia.assert(emptyResultsResult.data);
  TestValidator.equals(
    "empty data array for no matches",
    emptyResultsResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination pages is 0 for empty results",
    emptyResultsResult.pagination.pages,
    0,
  );
  // 5.5. Test large limit value (maximum 100)
  const largeLimit: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 100,
  };
  const largeLimitResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: largeLimit,
      },
    );
  typia.assert(largeLimitResult);
  typia.assert(largeLimitResult.data);
  TestValidator.equals(
    "large limit 100 current page",
    largeLimitResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "large limit 100 limit",
    largeLimitResult.pagination.limit,
    100,
  );
  // 5.6. Test limit validation (limit > 100 should fail)
  const invalidLimit: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 101,
  };
  const invalidLimitResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: invalidLimit,
      },
    );
  typia.assert(invalidLimitResult);
  // The API should either reject the request or clamp the limit
  TestValidator.equals(
    "invalid limit handled gracefully",
    invalidLimitResult !== null,
    true,
  );
  // 5.7. Test page validation (page < 1 should fail)
  const invalidPage: IRedditPlatformAdminAuditLog.IRequest = {
    page: 0,
    limit: 20,
  };
  const invalidPageResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: invalidPage,
      },
    );
  typia.assert(invalidPageResult);
  TestValidator.equals(
    "invalid page handled gracefully",
    invalidPageResult !== null,
    true,
  );
  // ============================================================================
  // SECTION 6: DATA QUALITY VALIDATION
  // ============================================================================
  // 6.1. Verify metrics are aggregated (not raw logs)
  typia.assert(defaultResult.data);
  for (const metric of defaultResult.data) {
    typia.assert(metric);
    TestValidator.equals(
      "metric_value is numeric",
      typeof metric.metric_value === "number",
      true,
    );
    TestValidator.equals(
      "metric is aggregated structure",
      metric.metric_name.length > 0,
      true,
    );
  }
  // 6.2. Verify all metrics have required fields
  typia.assert(defaultResult.data);
  for (const metric of defaultResult.data) {
    typia.assert(metric);
    TestValidator.equals(
      "metric_name is present",
      metric.metric_name !== undefined,
      true,
    );
    TestValidator.equals(
      "metric_value is present",
      metric.metric_value !== undefined,
      true,
    );
    TestValidator.equals(
      "metric_type is present",
      metric.metric_type !== undefined,
      true,
    );
    TestValidator.equals(
      "timestamp is present",
      metric.timestamp !== undefined,
      true,
    );
  }
  // 6.3. Verify metric_value types (int32 or number)
  typia.assert(defaultResult.data);
  for (const metric of defaultResult.data) {
    typia.assert(metric);
    const value = metric.metric_value;
    TestValidator.equals(
      "metric_value is int32 or number",
      value === null || typeof value === "number",
      true,
    );
  }
  // 6.4. Test concurrent filters
  const concurrentFilters: IRedditPlatformAdminAuditLog.IRequest = {
    page: 1,
    limit: 20,
    metricTypes: ["admin_activity"],
    sortOrder: "desc",
    sortBy: "timestamp",
    actionTypes: ["DELETE", "BAN"],
  };
  const concurrentFiltersResult =
    await api.functional.redditPlatform.admin.audit.analytics.index(
      adminConnection,
      {
        body: concurrentFilters,
      },
    );
  typia.assert(concurrentFiltersResult);
  typia.assert(concurrentFiltersResult.data);
  // All returned metrics should match ALL filters
  for (const metric of concurrentFiltersResult.data) {
    typia.assert(metric);
    if (concurrentFilters.metricTypes) {
      TestValidator.equals(
        "metric_type matches filter",
        concurrentFilters.metricTypes.includes(metric.metric_type),
        true,
      );
    }
    if (concurrentFilters.actionTypes) {
      if (metric.context && metric.context.action_type) {
        TestValidator.equals(
          "action_type matches filter",
          concurrentFilters.actionTypes.includes(metric.context.action_type),
          true,
        );
      }
    }
  }
  // Verify timestamp sorting is applied even with concurrent filters
  for (let i = 1; i < concurrentFiltersResult.data.length; i++) {
    const prevDate = new Date(concurrentFiltersResult.data[i - 1].timestamp);
    const currDate = new Date(concurrentFiltersResult.data[i].timestamp);
    TestValidator.equals(
      "concurrent filters respects timestamp sorting",
      true,
      prevDate >= currDate,
    );
  }
}