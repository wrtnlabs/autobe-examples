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
 * Test administrator audit log analytics filtering by member activity tracking.
 *
 * This test verifies that administrators can effectively filter and track member
 * activities through the audit log analytics endpoint. It validates filtering by
 * actor type, action type, member ID, date ranges, and pagination capabilities.
 */
export async function test_api_audit_logs_member_activity_tracking(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.discussionBoard.auth.admin.join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(adminAuth);
  // 2. Get audit logs filtered by actor_type='member'
  const memberActivityLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          page: 1,
          limit: 100,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(memberActivityLogs);
  // 3. Verify all records have actor_type='member' and member field populated
  if (memberActivityLogs.data.length > 0) {
    TestValidator.predicate(
      "all records have actor_type member",
      memberActivityLogs.data.every((log) => log.actor_type === "member"),
    );
    TestValidator.predicate(
      "all records have member field populated",
      memberActivityLogs.data.every((log) => log.member !== null),
    );
    TestValidator.predicate(
      "all records have admin field null for member actions",
      memberActivityLogs.data.every((log) => log.admin === null),
    );
    // 4. Verify member summary structure
    const firstLog = memberActivityLogs.data[0];
    TestValidator.predicate(
      "member has valid id",
      firstLog.member!.id !== undefined,
    );
    TestValidator.predicate(
      "member has valid display name",
      firstLog.member!.displayName !== undefined,
    );
  }
  // 5. Test filtering by action_type
  const articleCreateLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          action_type: "article.create",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(articleCreateLogs);
  // 6. Verify action_type filtering
  if (articleCreateLogs.data.length > 0) {
    TestValidator.predicate(
      "all records have article.create action type",
      articleCreateLogs.data.every(
        (log) => log.action_type === "article.create",
      ),
    );
  }
  // 7. Test date range filtering
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
  const dateRangeLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          created_at_from: oneHourAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeLogs);
  // 8. Verify date range filtering
  if (dateRangeLogs.data.length > 0) {
    TestValidator.predicate(
      "all records within date range",
      dateRangeLogs.data.every((log) => {
        const logDate = new Date(log.created_at);
        return logDate >= oneHourAgo && logDate <= now;
      }),
    );
  }
  // 9. Test pagination
  const paginatedLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  // 10. Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    paginatedLogs.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 10",
    paginatedLogs.pagination.limit === 10,
  );
  TestValidator.predicate(
    "data array length does not exceed limit",
    paginatedLogs.data.length <= paginatedLogs.pagination.limit,
  );
  // 11. Test filtering by member_id (using random UUID for empty results test)
  const nonExistentMemberId = typia.random<string & tags.Format<"uuid">>();
  const emptyLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          member_id: nonExistentMemberId,
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(emptyLogs);
  // 12. Verify empty results for non-existent member
  TestValidator.predicate(
    "empty results for non-existent member",
    emptyLogs.data.length === 0,
  );
  TestValidator.predicate(
    "pagination records is 0 for empty results",
    emptyLogs.pagination.records === 0,
  );
  // 13. Test resource tracking in member actions
  if (memberActivityLogs.data.length > 0) {
    const resourceTrackedLogs = memberActivityLogs.data.filter(
      (log) => log.resource_type !== undefined && log.resource_id !== undefined,
    );
    TestValidator.predicate(
      "member actions have resource tracking",
      resourceTrackedLogs.length > 0,
    );
  }
  // 14. Test combined filters: actor_type with resource_type
  const resourceTypeLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          resource_type: "article",
          page: 1,
          limit: 100,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(resourceTypeLogs);
  // 15. Verify resource_type filtering
  if (resourceTypeLogs.data.length > 0) {
    TestValidator.predicate(
      "all records have article resource type",
      resourceTypeLogs.data.every((log) => log.resource_type === "article"),
    );
  }
}
