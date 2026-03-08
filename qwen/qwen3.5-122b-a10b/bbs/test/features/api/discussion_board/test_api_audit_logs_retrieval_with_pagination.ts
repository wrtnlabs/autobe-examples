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
 * Test audit logs retrieval with pagination.
 * 1. Admin authenticates
 * 2. Retrieve audit logs with default pagination
 * 3. Verify response structure
 * 4. Test filtering by actor_type
 * 5. Test filtering by action_type
 * 6. Test filtering by resource_type
 * 7. Test date range filtering
 * 8. Test pagination with different pages
 * 9. Test empty results
 */
export async function test_api_audit_logs_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
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
  // 2. Retrieve audit logs with default pagination
  const defaultLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(defaultLogs);
  // 3. Verify response structure
  TestValidator.equals(
    "pagination exists",
    defaultLogs.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "data array exists",
    Array.isArray(defaultLogs.data),
    true,
  );
  TestValidator.predicate(
    "has current page",
    defaultLogs.pagination.current >= 1,
  );
  TestValidator.predicate("has limit", defaultLogs.pagination.limit > 0);
  TestValidator.predicate(
    "has records count",
    defaultLogs.pagination.records >= 0,
  );
  TestValidator.predicate("has pages count", defaultLogs.pagination.pages >= 0);
  // Verify audit log entry structure
  if (defaultLogs.data.length > 0) {
    const firstLog = defaultLogs.data[0];
    TestValidator.predicate("has id", firstLog.id !== undefined);
    TestValidator.predicate(
      "has actor_type",
      firstLog.actor_type !== undefined,
    );
    TestValidator.predicate(
      "has action_type",
      firstLog.action_type !== undefined,
    );
    TestValidator.predicate(
      "has resource_type",
      firstLog.resource_type !== undefined,
    );
    TestValidator.predicate(
      "has resource_id",
      firstLog.resource_id !== undefined,
    );
    TestValidator.predicate(
      "has created_at",
      firstLog.created_at !== undefined,
    );
    // member or admin should be present (one of them)
    TestValidator.predicate(
      "has member or admin",
      firstLog.member !== null || firstLog.admin !== null,
    );
  }
  // 4. Test filtering by actor_type
  const memberLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(memberLogs);
  TestValidator.predicate(
    "all member logs",
    memberLogs.data.every((log) => log.actor_type === "member"),
  );
  const adminLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          actor_type: "admin",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(adminLogs);
  TestValidator.predicate(
    "all admin logs",
    adminLogs.data.every((log) => log.actor_type === "admin"),
  );
  const systemLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          actor_type: "system",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(systemLogs);
  TestValidator.predicate(
    "all system logs",
    systemLogs.data.every((log) => log.actor_type === "system"),
  );
  // 5. Test filtering by action_type
  const articleCreateLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          action_type: "article.create",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(articleCreateLogs);
  TestValidator.predicate(
    "all article.create logs",
    articleCreateLogs.data.every((log) => log.action_type === "article.create"),
  );
  // 6. Test filtering by resource_type
  const articleLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          resource_type: "article",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(articleLogs);
  TestValidator.predicate(
    "all article resource logs",
    articleLogs.data.every((log) => log.resource_type === "article"),
  );
  // 7. Test date range filtering
  const now = new Date();
  const dateRangeLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          created_at_from: new Date(now.getTime() - 86400000 * 7).toISOString(), // 7 days ago
          created_at_to: now.toISOString(),
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeLogs);
  TestValidator.predicate(
    "all within date range",
    dateRangeLogs.data.every((log) => {
      const logDate = new Date(log.created_at);
      return (
        logDate >= new Date(now.getTime() - 86400000 * 7) && logDate <= now
      );
    }),
  );
  // 8. Test pagination with different pages
  const page2Logs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(page2Logs);
  TestValidator.equals("page 2", page2Logs.pagination.current, 2);
  // 9. Test empty results
  const emptyLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      adminConnection,
      {
        body: {
          action_type: "nonexistent.action.type",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(emptyLogs);
  TestValidator.equals("empty data", emptyLogs.data.length, 0);
  TestValidator.equals("zero records", emptyLogs.pagination.records, 0);
  TestValidator.equals("zero pages", emptyLogs.pagination.pages, 0);
}
