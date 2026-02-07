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
 * Test audit analytics focused on moderation effectiveness and administrative actions.
 * This scenario validates the system's ability to track moderation activities by filtering
 * for admin and super_admin actor types with moderation-related action categories.
 * The test verifies that the system correctly aggregates moderation actions, calculates
 * success rates for administrative operations, and provides insights into moderation efficiency.
 */
export async function test_api_audit_logs_analytics_moderation_effectiveness(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection for analytics access
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Define date range for analytics (last week)
  const endDate = new Date().toISOString();
  const startDate = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  // Request analytics specifically for admin moderation activities
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.analytics(
      superAdminConnection,
      {
        body: {
          actor_type: "admin",
          action_type: null,
          success: null,
          start_date: startDate,
          end_date: endDate,
          time_bucket: "weekly",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate we received proper pagination structure
  TestValidator.predicate(
    "has valid pagination",
    analyticsResponse.pagination.current >= 1 &&
      analyticsResponse.pagination.limit >= 1 &&
      analyticsResponse.pagination.records >= 0 &&
      analyticsResponse.pagination.pages >= 0,
  );
  // Validate analytics data contains expected moderation metrics
  TestValidator.equals(
    "data is array",
    Array.isArray(analyticsResponse.data),
    true,
  );
  // If we have data, validate it contains admin/super_admin moderation activities
  if (analyticsResponse.data.length > 0) {
    const hasModerationActivities = analyticsResponse.data.some(
      (summary) =>
        ((summary.actorType === "admin" ||
          summary.actorType === "super_admin") &&
          summary.actionType.includes("ban")) ||
        summary.actionType.includes("delete") ||
        summary.actionType.includes("moderate"),
    );
    TestValidator.predicate(
      "contains moderation activities",
      hasModerationActivities,
    );
  }
  // Test with super_admin actor type specifically for elevated privileges
  const superAdminAnalytics =
    await api.functional.discussionBoard.superAdmin.audit_logs.analytics(
      superAdminConnection,
      {
        body: {
          actor_type: "super_admin",
          action_type: null,
          success: null,
          start_date: startDate,
          end_date: endDate,
          time_bucket: "weekly",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(superAdminAnalytics);
  // Test with specific moderation action types
  const banActionsAnalytics =
    await api.functional.discussionBoard.superAdmin.audit_logs.analytics(
      superAdminConnection,
      {
        body: {
          actor_type: null,
          action_type: "user_ban",
          success: null,
          start_date: startDate,
          end_date: endDate,
          time_bucket: "weekly",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(banActionsAnalytics);
  // Validate that ban actions analytics provide meaningful data
  TestValidator.predicate(
    "ban actions have valid structure",
    banActionsAnalytics.data.every(
      (item) =>
        item.totalCount >= 0 &&
        item.successCount >= 0 &&
        item.failureCount >= 0 &&
        item.successRate >= 0 &&
        item.successRate <= 100,
    ),
  );
  // Test success rate filtering for effective moderation
  const successfulModeration =
    await api.functional.discussionBoard.superAdmin.audit_logs.analytics(
      superAdminConnection,
      {
        body: {
          actor_type: "admin",
          action_type: null,
          success: true,
          start_date: startDate,
          end_date: endDate,
          time_bucket: "weekly",
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(successfulModeration);
  // Validate successful moderation analytics
  if (successfulModeration.data.length > 0) {
    TestValidator.predicate(
      "successful moderation has high success rate",
      successfulModeration.data.every((item) => item.successRate === 100),
    );
  }
}