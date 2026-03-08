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

export async function test_api_audit_logs_retrieval_with_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as admin
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
  // 2. Test basic audit logs retrieval with pagination
  const basicLogs = await api.functional.discussionBoard.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IDiscussionBoardAuditLog.IRequest,
    },
  );
  typia.assert(basicLogs);
  // Validate pagination metadata
  TestValidator.equals("current page", basicLogs.pagination.current, 1);
  TestValidator.equals("limit", basicLogs.pagination.limit, 10);
  TestValidator.predicate("has records", basicLogs.pagination.records >= 0);
  TestValidator.predicate("pages calculated", basicLogs.pagination.pages >= 0);
  // Validate response structure
  TestValidator.predicate("has data array", Array.isArray(basicLogs.data));
  // 3. Test filtering by actor_type = 'admin'
  const adminLogs = await api.functional.discussionBoard.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        actor_type: "admin",
        page: 1,
        limit: 20,
      } satisfies IDiscussionBoardAuditLog.IRequest,
    },
  );
  typia.assert(adminLogs);
  // Verify all returned logs have actor_type = 'admin'
  for (const log of adminLogs.data) {
    TestValidator.equals("actor type is admin", log.actor_type, "admin");
  }
  // 4. Test filtering by actor_type = 'member'
  const memberLogs =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          actor_type: "member",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(memberLogs);
  // Verify all returned logs have actor_type = 'member'
  for (const log of memberLogs.data) {
    TestValidator.equals("actor type is member", log.actor_type, "member");
  }
  // 5. Test filtering by actor_type = 'system'
  const systemLogs =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          actor_type: "system",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(systemLogs);
  // Verify all returned logs have actor_type = 'system'
  for (const log of systemLogs.data) {
    TestValidator.equals("actor type is system", log.actor_type, "system");
  }
  // 6. Test pagination with different page numbers
  const page2Logs = await api.functional.discussionBoard.admin.audit_logs.index(
    adminConnection,
    {
      body: {
        page: 2,
        limit: 5,
      } satisfies IDiscussionBoardAuditLog.IRequest,
    },
  );
  typia.assert(page2Logs);
  TestValidator.equals("page 2 current", page2Logs.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Logs.pagination.limit, 5);
  // 7. Test ordering by created_at descending
  if (basicLogs.data.length > 1) {
    for (let i = 0; i < basicLogs.data.length - 1; i++) {
      TestValidator.predicate(
        `record ${i} is newer than record ${i + 1}`,
        basicLogs.data[i].created_at >= basicLogs.data[i + 1].created_at,
      );
    }
  }
  // 8. Validate audit log summary structure for each record
  for (const log of basicLogs.data) {
    // Required fields
    TestValidator.predicate("has id", log.id !== undefined && log.id !== null);
    TestValidator.predicate("has actor_type", log.actor_type !== undefined);
    TestValidator.predicate("has action_type", log.action_type !== undefined);
    TestValidator.predicate(
      "has resource_type",
      log.resource_type !== undefined,
    );
    TestValidator.predicate(
      "has resource_id",
      log.resource_id !== undefined && log.resource_id !== null,
    );
    TestValidator.predicate("has created_at", log.created_at !== undefined);
    // Optional fields can be null
    // member and admin are mutually exclusive based on actor_type
    if (log.actor_type === "member") {
      TestValidator.predicate(
        "member exists for member actor",
        log.member !== null,
      );
      if (log.member !== null) {
        TestValidator.predicate("member has id", log.member.id !== undefined);
        TestValidator.predicate(
          "member has displayName",
          log.member.displayName !== undefined,
        );
      }
    } else if (log.actor_type === "admin") {
      TestValidator.predicate(
        "admin exists for admin actor",
        log.admin !== null,
      );
      if (log.admin !== null) {
        TestValidator.predicate("admin has id", log.admin.id !== undefined);
        TestValidator.predicate(
          "admin has email",
          log.admin.email !== undefined,
        );
        TestValidator.predicate(
          "admin has display_name",
          log.admin.display_name !== undefined,
        );
      }
    }
    // metadata, ip_address, user_agent can be null
    // No validation needed for nullable fields
  }
  // 9. Test filtering by action_type
  const actionTypeLogs =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          action_type: "article.create",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(actionTypeLogs);
  // Verify all returned logs have matching action_type
  for (const log of actionTypeLogs.data) {
    TestValidator.equals(
      "action type matches filter",
      log.action_type,
      "article.create",
    );
  }
  // 10. Test filtering by resource_type
  const resourceTypeLogs =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: {
          resource_type: "article",
          page: 1,
          limit: 20,
        } satisfies IDiscussionBoardAuditLog.IRequest,
      },
    );
  typia.assert(resourceTypeLogs);
  // Verify all returned logs have matching resource_type
  for (const log of resourceTypeLogs.data) {
    TestValidator.equals(
      "resource type matches filter",
      log.resource_type,
      "article",
    );
  }
}
