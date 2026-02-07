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
 * Test the audit logs analytics endpoint with comprehensive filtering to generate platform-wide activity overview.
 * This scenario validates that super administrators can retrieve aggregated statistics across all actor types
 * and action categories for a specified time period.
 */
export async function test_api_audit_logs_analytics_comprehensive_platform_overview(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    },
  });
  // 2. Create realistic date range (last 30 days)
  const endDate = new Date();
  const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
  // 3. Test analytics with comprehensive filtering
  const analyticsResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.analytics(
      superAdminConnection,
      {
        body: {
          actor_type: null,
          action_type: null,
          success: null,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          time_bucket: "daily",
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(analyticsResponse);
  // 4. Validate pagination structure
  TestValidator.equals(
    "pagination structure",
    typeof analyticsResponse.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page positive",
    analyticsResponse.pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit reasonable",
    analyticsResponse.pagination.limit >= 1 &&
      analyticsResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records non-negative",
    analyticsResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages non-negative",
    analyticsResponse.pagination.pages >= 0,
  );
  // 5. Validate analytics data structure
  TestValidator.equals(
    "data is array",
    Array.isArray(analyticsResponse.data),
    true,
  );
  if (analyticsResponse.data.length > 0) {
    const sampleRecord = analyticsResponse.data[0];
    // Validate required fields
    TestValidator.predicate(
      "timeBucket is date string",
      typeof sampleRecord.timeBucket === "string",
    );
    TestValidator.predicate(
      "actorType valid",
      ["user", "admin", "super_admin", "system"].includes(
        sampleRecord.actorType,
      ),
    );
    TestValidator.predicate(
      "actionType is string",
      typeof sampleRecord.actionType === "string",
    );
    TestValidator.predicate(
      "totalCount non-negative",
      sampleRecord.totalCount >= 0,
    );
    TestValidator.predicate(
      "successCount non-negative",
      sampleRecord.successCount >= 0,
    );
    TestValidator.predicate(
      "failureCount non-negative",
      sampleRecord.failureCount >= 0,
    );
    TestValidator.predicate(
      "successRate valid percentage",
      sampleRecord.successRate >= 0 && sampleRecord.successRate <= 100,
    );
    // Validate statistical calculations
    if (sampleRecord.totalCount > 0) {
      const expectedSuccessRate =
        (sampleRecord.successCount / sampleRecord.totalCount) * 100;
      TestValidator.equals(
        "successRate calculation",
        sampleRecord.successRate,
        expectedSuccessRate,
      );
      TestValidator.equals(
        "totalCount equals sum",
        sampleRecord.totalCount,
        sampleRecord.successCount + sampleRecord.failureCount,
      );
    }
    // Check trend indicator if present
    if (sampleRecord.trendIndicator !== undefined) {
      TestValidator.predicate(
        "trendIndicator valid",
        ["increasing", "decreasing", "stable"].includes(
          sampleRecord.trendIndicator,
        ),
      );
    }
  }
  // 6. Test with specific actor type filtering
  const userAnalyticsResponse =
    await api.functional.discussionBoard.superAdmin.audit_logs.analytics(
      superAdminConnection,
      {
        body: {
          actor_type: "user",
          action_type: null,
          success: null,
          start_date: startDate.toISOString(),
          end_date: endDate.toISOString(),
          time_bucket: "daily",
          page: 1,
          limit: 50,
        },
      },
    );
  typia.assert(userAnalyticsResponse);
  // Validate that filtering by actor_type works
  if (userAnalyticsResponse.data.length > 0) {
    const hasOnlyUserRecords = userAnalyticsResponse.data.every(
      (record) => record.actorType === "user",
    );
    TestValidator.predicate("filtered by user actor type", hasOnlyUserRecords);
  }
}
