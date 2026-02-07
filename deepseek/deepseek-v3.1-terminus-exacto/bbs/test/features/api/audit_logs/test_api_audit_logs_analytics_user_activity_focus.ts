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

export async function test_api_audit_logs_analytics_user_activity_focus(
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
  // Define time range for analytics (last 24 hours)
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  // Request analytics with user actor type and broader login-related action filter
  // Using null for action_type to get all user activities, then filter client-side
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.analytics(
      superAdminConnection,
      {
        body: {
          actor_type: "user" as const,
          action_type: null, // Get all action types, filter login-related ones client-side
          start_date: startDate,
          end_date: endDate,
          time_bucket: "hourly" as const,
          page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 24 satisfies number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(analyticsResponse);
  // Validate response structure
  TestValidator.equals(
    "response has pagination",
    typeof analyticsResponse.pagination,
    "object",
  );
  TestValidator.equals(
    "response has data array",
    Array.isArray(analyticsResponse.data),
    true,
  );
  // Validate pagination structure
  const pagination = analyticsResponse.pagination;
  TestValidator.predicate("pagination has current", pagination.current >= 0);
  TestValidator.predicate("pagination has limit", pagination.limit >= 0);
  TestValidator.predicate("pagination has records", pagination.records >= 0);
  TestValidator.predicate("pagination has pages", pagination.pages >= 0);
  // Filter for login-related activities client-side
  const loginActivities = analyticsResponse.data.filter((summary) =>
    summary.actionType.includes("login"),
  );
  // Validate login-related analytics
  for (const summary of loginActivities) {
    typia.assert(summary);
    // Validate actor type is user
    TestValidator.equals("actor type is user", summary.actorType, "user");
    // Validate action type contains login
    TestValidator.predicate(
      "action type contains login",
      summary.actionType.includes("login"),
    );
    // Validate time bucket format
    TestValidator.predicate(
      "valid time bucket",
      !isNaN(Date.parse(summary.timeBucket)),
    );
    // Validate counts are non-negative
    TestValidator.predicate(
      "total count non-negative",
      summary.totalCount >= 0,
    );
    TestValidator.predicate(
      "success count non-negative",
      summary.successCount >= 0,
    );
    TestValidator.predicate(
      "failure count non-negative",
      summary.failureCount >= 0,
    );
    // Validate success rate calculation
    TestValidator.predicate(
      "success rate between 0-100",
      summary.successRate >= 0 && summary.successRate <= 100,
    );
    // Validate counts add up correctly
    TestValidator.equals(
      "total equals success + failure",
      summary.totalCount,
      summary.successCount + summary.failureCount,
    );
    // Validate success rate calculation accuracy
    const expectedSuccessRate =
      summary.totalCount > 0
        ? (summary.successCount / summary.totalCount) * 100
        : 0;
    TestValidator.equals(
      "success rate calculated correctly",
      summary.successRate,
      expectedSuccessRate,
    );
  }
  // Validate that we have login activity data
  TestValidator.predicate(
    "has user login activity data",
    loginActivities.length > 0,
  );
  // Additional validation: ensure all returned data has user actor type
  for (const summary of analyticsResponse.data) {
    TestValidator.equals(
      "all entries have user actor type",
      summary.actorType,
      "user",
    );
  }
}
