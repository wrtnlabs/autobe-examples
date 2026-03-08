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

export async function test_api_audit_logs_member_admin_id_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // 2. Test filtering by admin_id - filter audit logs by the admin who performed actions
  const adminIdFilter: IDiscussionBoardAuditLog.IRequest = {
    admin_id: adminAuth.id,
  };
  const adminFilteredLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: adminIdFilter,
      },
    );
  typia.assert(adminFilteredLogs);
  // Verify all returned logs have admin_id matching the filter
  for (const log of adminFilteredLogs.data) {
    TestValidator.equals(
      "admin_id matches filter when filtering by admin_id",
      log.admin?.id,
      adminAuth.id,
    );
    TestValidator.predicate(
      "admin field is populated when filtering by admin actions",
      log.admin !== null,
    );
    TestValidator.predicate(
      "member field is null when filtering by admin actions",
      log.member === null,
    );
  }
  // 3. Test filtering by member_id with a random UUID
  // This tests the filter mechanism itself - if there are no matching records, empty array is returned
  const randomMemberId = typia.random<string & tags.Format<"uuid">>();
  const memberIdFilter: IDiscussionBoardAuditLog.IRequest = {
    member_id: randomMemberId,
  };
  const memberFilteredLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: memberIdFilter,
      },
    );
  typia.assert(memberFilteredLogs);
  // Verify response structure is correct even with no matching records
  TestValidator.predicate(
    "member filtering returns valid response structure",
    Array.isArray(memberFilteredLogs.data),
  );
  // If there are any matching records, verify member field is populated
  for (const log of memberFilteredLogs.data) {
    TestValidator.equals(
      "member_id matches filter when filtering by member_id",
      log.member?.id,
      randomMemberId,
    );
    TestValidator.predicate(
      "member field is populated when filtering by member actions",
      log.member !== null,
    );
    TestValidator.predicate(
      "admin field is null when filtering by member actions",
      log.admin === null,
    );
  }
  // 4. Test combined filtering - member_id + action_type
  const combinedFilter: IDiscussionBoardAuditLog.IRequest = {
    member_id: randomMemberId,
    action_type: "article.create",
  };
  const combinedFilteredLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: combinedFilter,
      },
    );
  typia.assert(combinedFilteredLogs);
  // Verify response structure and that all logs match both filters
  for (const log of combinedFilteredLogs.data) {
    TestValidator.equals(
      "member_id matches in combined filter",
      log.member?.id,
      randomMemberId,
    );
    TestValidator.equals(
      "action_type matches in combined filter",
      log.action_type,
      "article.create",
    );
  }
  // 5. Test null member_id and admin_id (should return all logs without actor filtering)
  const noActorFilter: IDiscussionBoardAuditLog.IRequest = {
    member_id: null,
    admin_id: null,
  };
  const noActorFilteredLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: noActorFilter,
      },
    );
  typia.assert(noActorFilteredLogs);
  // Verify response structure is correct
  TestValidator.predicate(
    "null filters return valid response structure",
    Array.isArray(noActorFilteredLogs.data),
  );
  // 6. Test filtering by admin_id with null member_id (explicit exclusion)
  const adminOnlyFilter: IDiscussionBoardAuditLog.IRequest = {
    admin_id: adminAuth.id,
    member_id: null,
  };
  const adminOnlyLogs: IPageIDiscussionBoardAuditLog.ISummary =
    await api.functional.discussionBoard.admin.audit_logs.index(
      adminConnection,
      {
        body: adminOnlyFilter,
      },
    );
  typia.assert(adminOnlyLogs);
  // Verify all logs are from admin
  for (const log of adminOnlyLogs.data) {
    TestValidator.equals(
      "admin_id matches when filtering admin_id with null member_id",
      log.admin?.id,
      adminAuth.id,
    );
    TestValidator.predicate(
      "member field is null with admin_id filter",
      log.member === null,
    );
  }
  // 7. Verify pagination metadata is present
  TestValidator.predicate(
    "pagination metadata exists",
    noActorFilteredLogs.pagination !== undefined,
  );
  TestValidator.predicate(
    "pagination has current page",
    noActorFilteredLogs.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has limit",
    noActorFilteredLogs.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has records count",
    noActorFilteredLogs.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages count",
    noActorFilteredLogs.pagination.pages >= 0,
  );
}
