import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test audit log retrieval with specific date ranges and time bucket aggregations.
 * Tests hourly, daily, weekly, and monthly time bucket aggregations with various
 * filtering criteria and validates statistical calculations and trend indicators.
 */
export async function test_api_audit_logs_date_range_analysis(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Test hourly aggregation
  const hourlyRequest = {
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    time_bucket: "hourly" as const,
    page: 1 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const hourlyResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: hourlyRequest },
    );
  typia.assert(hourlyResponse);
  // Test daily aggregation
  const dailyRequest = {
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    time_bucket: "daily" as const,
    page: 1 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const dailyResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: dailyRequest },
    );
  typia.assert(dailyResponse);
  // Test weekly aggregation
  const weeklyRequest = {
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    time_bucket: "weekly" as const,
    page: 1 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const weeklyResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: weeklyRequest },
    );
  typia.assert(weeklyResponse);
  // Test monthly aggregation
  const monthlyRequest = {
    start_date: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    time_bucket: "monthly" as const,
    page: 1 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const monthlyResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: monthlyRequest },
    );
  typia.assert(monthlyResponse);
  // Test with actor type filter
  const actorFilterRequest = {
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    time_bucket: "hourly" as const,
    actor_type: "user" as const,
    page: 1 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const actorFilterResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: actorFilterRequest },
    );
  typia.assert(actorFilterResponse);
  // Test with success filter
  const successFilterRequest = {
    start_date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    time_bucket: "hourly" as const,
    success: true,
    page: 1 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const successFilterResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: successFilterRequest },
    );
  typia.assert(successFilterResponse);
  // Test pagination
  const paginationRequest = {
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    end_date: new Date().toISOString(),
    time_bucket: "daily" as const,
    page: 2 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 5 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const paginationResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationResponse);
  // Test edge case: very short date range (might return empty results)
  const edgeCaseRequest = {
    start_date: new Date(Date.now() - 60 * 1000).toISOString(), // 1 minute ago
    end_date: new Date().toISOString(),
    time_bucket: "hourly" as const,
    page: 1 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1>,
    limit: 10 satisfies number as number satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
  } satisfies IDiscussionBoardAuditLog.IRequest;
  const edgeCaseResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      { body: edgeCaseRequest },
    );
  typia.assert(edgeCaseResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination structure exists",
    typeof paginationResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "pagination has current page",
    paginationResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination has limit",
    paginationResponse.pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination has records",
    paginationResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    paginationResponse.pagination.pages >= 0,
  );
  // Validate data array structure and business logic
  if (paginationResponse.data.length > 0) {
    const firstItem = paginationResponse.data[0];
    TestValidator.predicate(
      "has timeBucket",
      typeof firstItem.timeBucket === "string",
    );
    TestValidator.predicate(
      "has actorType",
      ["user", "admin", "super_admin", "system"].includes(firstItem.actorType),
    );
    TestValidator.predicate(
      "has actionType",
      typeof firstItem.actionType === "string",
    );
    TestValidator.predicate("has totalCount", firstItem.totalCount >= 0);
    TestValidator.predicate("has successCount", firstItem.successCount >= 0);
    TestValidator.predicate("has failureCount", firstItem.failureCount >= 0);
    TestValidator.predicate(
      "has successRate",
      firstItem.successRate >= 0 && firstItem.successRate <= 100,
    );
    // Validate success rate calculation logic
    if (firstItem.totalCount > 0) {
      const expectedSuccessRate =
        (firstItem.successCount / firstItem.totalCount) * 100;
      TestValidator.equals(
        "success rate calculation",
        firstItem.successRate,
        expectedSuccessRate,
      );
    } else {
      TestValidator.equals(
        "success rate for zero total",
        firstItem.successRate,
        0,
      );
    }
    // Validate totalCount = successCount + failureCount
    TestValidator.equals(
      "total equals success plus failure",
      firstItem.totalCount,
      firstItem.successCount + firstItem.failureCount,
    );
    if (firstItem.trendIndicator) {
      TestValidator.predicate(
        "valid trend indicator",
        ["increasing", "decreasing", "stable"].includes(
          firstItem.trendIndicator,
        ),
      );
    }
  }
  // Validate time bucket grouping (check that timeBucket values are properly formatted)
  if (hourlyResponse.data.length > 0) {
    const hourlyItem = hourlyResponse.data[0];
    const timeBucketDate = new Date(hourlyItem.timeBucket);
    TestValidator.predicate(
      "timeBucket is valid date",
      !isNaN(timeBucketDate.getTime()),
    );
  }
}
