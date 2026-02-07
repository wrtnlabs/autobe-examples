import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAuditLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test searching audit logs filtered by specific actor types (user, admin, super_admin, system)
 * to verify proper categorization and filtering functionality.
 */
export async function test_api_audit_logs_search_by_actor_type(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Define actor types to test
  const actorTypes: ("user" | "admin" | "super_admin" | "system")[] = [
    "user",
    "admin",
    "super_admin",
    "system",
  ];
  for (const actorType of actorTypes) {
    // Create search request for specific actor type
    const searchRequest = {
      actor_type: actorType,
      action_type: null,
      success: null,
      start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
      end_date: new Date().toISOString(),
      time_bucket: null,
      page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 10 satisfies number &
        tags.Type<"int32"> &
        tags.Minimum<1> &
        tags.Maximum<100>,
    } satisfies IDiscussionBoardAuditLog.IRequest;
    // Execute audit log search
    const response =
      await api.functional.discussionBoard.admin.audit_logs.index(
        adminConnection,
        { body: searchRequest },
      );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.equals(
      "pagination exists",
      typeof response.pagination,
      "object",
    );
    TestValidator.predicate(
      "pagination has current page",
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination has limit",
      response.pagination.limit >= 1,
    );
    TestValidator.predicate(
      "pagination has records count",
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination has pages count",
      response.pagination.pages >= 0,
    );
    // Validate data array structure
    TestValidator.equals("data is array", Array.isArray(response.data), true);
    // If there are audit log entries, validate actor type filtering
    if (response.data.length > 0) {
      for (const auditLog of response.data) {
        TestValidator.equals(
          "actor type matches filter",
          auditLog.actorType,
          actorType,
        );
        TestValidator.predicate(
          "total count is non-negative",
          auditLog.totalCount >= 0,
        );
        TestValidator.predicate(
          "success count is non-negative",
          auditLog.successCount >= 0,
        );
        TestValidator.predicate(
          "failure count is non-negative",
          auditLog.failureCount >= 0,
        );
        TestValidator.predicate(
          "success rate is valid",
          auditLog.successRate >= 0 && auditLog.successRate <= 100,
        );
        TestValidator.predicate(
          "time bucket is valid date",
          !isNaN(new Date(auditLog.timeBucket).getTime()),
        );
        TestValidator.predicate(
          "action type is string",
          typeof auditLog.actionType === "string",
        );
      }
    }
    // Verify that success + failure counts equal total count
    if (response.data.length > 0) {
      for (const auditLog of response.data) {
        TestValidator.equals(
          `success + failure equals total for ${actorType}`,
          auditLog.successCount + auditLog.failureCount,
          auditLog.totalCount,
        );
      }
    }
  }
}
