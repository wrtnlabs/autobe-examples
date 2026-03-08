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

export async function test_api_audit_logs_filter_by_admin_actions(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin accounts for testing
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // 2. Retrieve audit logs filtered by actor_type='admin'
  const adminAuditLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          actor_type: "admin",
          page: 1,
          limit: 10,
          sort_by: "created_at",
          sort_order: "desc",
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(adminAuditLogs);
  // 3. Verify all records have actor_type='admin' and admin field populated
  TestValidator.predicate(
    "all records have actor_type admin",
    adminAuditLogs.data.every((log) => log.actor_type === "admin"),
  );
  TestValidator.predicate(
    "all records have admin field populated",
    adminAuditLogs.data.every((log) => log.admin !== null),
  );
  TestValidator.predicate(
    "all records have member field null",
    adminAuditLogs.data.every((log) => log.member === null),
  );
  // 4. Test filtering by specific admin_id
  const specificAdminLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          actor_type: "admin",
          admin_id: superAdmin.id,
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(specificAdminLogs);
  TestValidator.predicate(
    "all logs belong to specified admin",
    specificAdminLogs.data.every((log) => log.admin?.id === superAdmin.id),
  );
  // 5. Test combined filters with date range
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const dateRangeLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          actor_type: "admin",
          created_at_from: thirtyDaysAgo.toISOString(),
          created_at_to: now.toISOString(),
          page: 1,
          limit: 50,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(dateRangeLogs);
  TestValidator.predicate(
    "all logs within date range",
    dateRangeLogs.data.every(
      (log) =>
        new Date(log.created_at) >= thirtyDaysAgo &&
        new Date(log.created_at) <= now,
    ),
  );
  // 6. Test pagination
  const page1Logs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          actor_type: "admin",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(page1Logs);
  const page2Logs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          actor_type: "admin",
          page: 2,
          limit: 5,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(page2Logs);
  TestValidator.equals("page 1 current", page1Logs.pagination.current, 1);
  TestValidator.equals("page 2 current", page2Logs.pagination.current, 2);
  TestValidator.predicate(
    "page 1 has correct limit",
    page1Logs.data.length <= 5,
  );
  TestValidator.predicate(
    "page 2 has correct limit",
    page2Logs.data.length <= 5,
  );
  // 7. Verify regular admin can also access audit logs
  const regularAdminLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      regularAdminConnection,
      {
        body: {
          actor_type: "admin",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(regularAdminLogs);
  TestValidator.predicate(
    "regular admin can retrieve admin audit logs",
    regularAdminLogs.data.length >= 0,
  );
  // 8. Verify sorting works correctly
  const sortedLogs =
    await api.functional.discussionBoard.admin.audit_logs.analytics.index(
      superAdminConnection,
      {
        body: {
          actor_type: "admin",
          sort_by: "created_at",
          sort_order: "desc",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(sortedLogs);
  if (sortedLogs.data.length > 1) {
    TestValidator.predicate(
      "logs sorted descending by created_at",
      sortedLogs.data.every((log, index) => {
        if (index === 0) return true;
        return (
          new Date(log.created_at) <=
          new Date(sortedLogs.data[index - 1].created_at)
        );
      }),
    );
  }
}
