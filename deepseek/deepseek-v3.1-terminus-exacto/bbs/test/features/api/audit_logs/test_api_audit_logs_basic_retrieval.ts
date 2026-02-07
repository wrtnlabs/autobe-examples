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
 * Test the basic functionality of retrieving audit logs with default pagination settings.
 * Verify that the endpoint returns a paginated response with audit log summaries
 * including time buckets, actor types, action types, total counts, success/failure counts,
 * and success rates. Validate that the pagination metadata (current page, limit,
 * total records, total pages) is correctly calculated and returned.
 */
export async function test_api_audit_logs_basic_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin using SDK function (no utility function available)
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Create audit log request with default pagination
  const requestBody: IDiscussionBoardAuditLog.IRequest = {
    start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    end_date: new Date().toISOString(), // current time
    actor_type: null,
    action_type: null,
    success: null,
    time_bucket: null,
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1> as number,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100> as number,
  };
  // Call the audit logs endpoint
  const response =
    await api.functional.discussionBoard.superAdmin.audit_logs.index(
      superAdminConnection,
      {
        body: requestBody,
      },
    );
  // Validate the response structure
  typia.assert(response);
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array structure for each audit log summary
  for (const auditLog of response.data) {
    typia.assert(auditLog);
    // Validate required fields
    TestValidator.predicate(
      "timeBucket is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/.test(
        auditLog.timeBucket,
      ),
    );
    const validActorTypes = ["user", "admin", "super_admin", "system"] as const;
    TestValidator.predicate(
      "actorType is valid",
      validActorTypes.includes(auditLog.actorType),
    );
    TestValidator.predicate(
      "actionType is string",
      typeof auditLog.actionType === "string",
    );
    TestValidator.predicate(
      "totalCount is non-negative",
      auditLog.totalCount >= 0,
    );
    TestValidator.predicate(
      "successCount is non-negative",
      auditLog.successCount >= 0,
    );
    TestValidator.predicate(
      "failureCount is non-negative",
      auditLog.failureCount >= 0,
    );
    TestValidator.predicate(
      "successRate is between 0 and 100",
      auditLog.successRate >= 0 && auditLog.successRate <= 100,
    );
    // Validate that totalCount equals successCount + failureCount
    TestValidator.equals(
      "total equals success plus failure",
      auditLog.totalCount,
      auditLog.successCount + auditLog.failureCount,
    );
    // Validate trend indicator if present
    if (auditLog.trendIndicator !== undefined) {
      const validTrends = ["increasing", "decreasing", "stable"] as const;
      TestValidator.predicate(
        "trendIndicator is valid",
        validTrends.includes(auditLog.trendIndicator),
      );
    }
  }
}
