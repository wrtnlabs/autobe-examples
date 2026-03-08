import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
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
 * Test audit log retrieval with pagination.
 *
 * 1. Authenticate as admin
 * 2. Retrieve audit logs with pagination parameters
 * 3. Verify response structure and pagination metadata
 * 4. Test empty results scenario
 */
export async function test_api_audit_log_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Retrieve audit logs with pagination
  const auditLogs =
    await api.functional.discussionBoard.admin.system.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(auditLogs);
  // 3. Verify pagination structure
  TestValidator.predicate(
    "pagination.current is positive",
    auditLogs.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination.limit is positive",
    auditLogs.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination.records is non-negative",
    auditLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    auditLogs.pagination.pages >= 0,
  );
  // 4. Verify data array structure when records exist
  if (auditLogs.data.length > 0) {
    const firstLog = auditLogs.data[0];
    typia.assert(firstLog);
    TestValidator.equals("audit log has id", typeof firstLog.id, "string");
    TestValidator.equals(
      "audit log has actor_type",
      typeof firstLog.actor_type,
      "string",
    );
    TestValidator.equals(
      "audit log has action_type",
      typeof firstLog.action_type,
      "string",
    );
    TestValidator.equals(
      "audit log has resource_type",
      typeof firstLog.resource_type,
      "string",
    );
    TestValidator.equals(
      "audit log has resource_id",
      typeof firstLog.resource_id,
      "string",
    );
    TestValidator.predicate(
      "audit log has created_at",
      typeof firstLog.created_at === "string",
    );
    // Verify member or admin is present (at least one should exist)
    TestValidator.predicate(
      "audit log has actor (member or admin)",
      firstLog.member !== null || firstLog.admin !== null,
    );
  }
  // 5. Test empty results with specific filter
  const emptyResult =
    await api.functional.discussionBoard.admin.system.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
          action_type: "nonexistent.action.type",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result has zero records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero pages",
    emptyResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty result has empty data array",
    emptyResult.data.length,
    0,
  );
}