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
 * Test audit log filtering by action_type parameter.
 *
 * This test validates that administrators can filter audit log records by specific
 * action types for compliance auditing and security monitoring purposes.
 */
export async function test_api_audit_log_filtering_by_action_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Generate audit logs by performing various actions
  // Note: In a real scenario, we would create articles, ban users, etc.
  // For this test, we'll use the audit log endpoint directly with different filters
  // 3. Test filtering by action_type parameter
  // Get all audit logs first (no filter)
  const allLogs =
    await api.functional.discussionBoard.admin.system.audit_logs.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(allLogs);
  // 4. Filter by specific action types
  const actionTypes = [
    "article.create",
    "comment.delete",
    "user.ban",
    "admin_request.approve",
  ];
  for (const actionType of actionTypes) {
    const filteredLogs =
      await api.functional.discussionBoard.admin.system.audit_logs.index(
        adminConnection,
        {
          body: {
            action_type: actionType,
            page: 1,
            limit: 100,
          } satisfies IDiscussionBoardAuditLog.IRequest,
        },
      );
    typia.assert(filteredLogs);
    // Validate that all returned logs match the filter
    for (const log of filteredLogs.data) {
      TestValidator.equals(
        `action_type should match filter "${actionType}"`,
        log.action_type,
        actionType,
      );
      // Validate structure
      TestValidator.predicate(
        "has valid id",
        log.id !== null && log.id !== undefined,
      );
      TestValidator.predicate(
        "has valid resource_id",
        log.resource_id !== null && log.resource_id !== undefined,
      );
      TestValidator.predicate(
        "has created_at",
        log.created_at !== null && log.created_at !== undefined,
      );
      // Validate pagination structure
      TestValidator.predicate(
        "pagination has current",
        filteredLogs.pagination.current > 0,
      );
      TestValidator.predicate(
        "pagination has limit",
        filteredLogs.pagination.limit > 0,
      );
      TestValidator.predicate(
        "pagination has records",
        filteredLogs.pagination.records >= 0,
      );
      TestValidator.predicate(
        "pagination has pages",
        filteredLogs.pagination.pages >= 0,
      );
    }
  }
  // 5. Test filtering by non-existent action type
  const emptyResult =
    await api.functional.discussionBoard.admin.system.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: "non.existent.action",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result should have no data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0",
    emptyResult.pagination.records,
    0,
  );
  // 6. Verify actor details are correctly joined
  if (allLogs.data.length > 0) {
    const sampleLog = allLogs.data[0];
    // At least one of member or admin should be present (or actor_type should be 'system')
    TestValidator.predicate(
      "has actor information",
      sampleLog.member !== null ||
        sampleLog.admin !== null ||
        sampleLog.actor_type === "system",
    );
    // If member exists, validate structure
    if (sampleLog.member !== null) {
      TestValidator.predicate(
        "member has id",
        sampleLog.member.id !== null && sampleLog.member.id !== undefined,
      );
      TestValidator.predicate(
        "member has displayName",
        sampleLog.member.displayName !== null &&
          sampleLog.member.displayName !== undefined,
      );
    }
    // If admin exists, validate structure
    if (sampleLog.admin !== null) {
      TestValidator.predicate(
        "admin has id",
        sampleLog.admin.id !== null && sampleLog.admin.id !== undefined,
      );
      TestValidator.predicate(
        "admin has email",
        sampleLog.admin.email !== null && sampleLog.admin.email !== undefined,
      );
      TestValidator.predicate(
        "admin has display_name",
        sampleLog.admin.display_name !== null &&
          sampleLog.admin.display_name !== undefined,
      );
    }
  }
  // 7. Validate metadata field handling
  for (const log of allLogs.data) {
    // metadata can be null or string
    if (log.metadata !== null) {
      TestValidator.predicate(
        "metadata is string when not null",
        typeof log.metadata === "string",
      );
    }
  }
}
