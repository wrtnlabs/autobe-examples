import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserLogin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardMemberUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserJoin";
import type { IDiscussionBoardMemberUserLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberUserLogin";
import type { IDiscussionBoardMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_admin_report_delete_for_active_report_rejected_by_policy(
  connection: api.IConnection,
) {
  // 1. Register a member user (memberUser actor) and get an authorized session
  const memberJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    displayName: RandomGenerator.name(2),
    bio: null,
    location: null,
    ip: null,
    href: "https://example.com/discussion/join",
    referrer: "https://example.com/landing",
  } satisfies IDiscussionBoardMemberUserJoin.IRequest;

  const memberAuthorized: IDiscussionBoardMemberuser.IAuthorized =
    await api.functional.auth.memberUser.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(memberAuthorized);

  // 2. As memberUser, create a new report in submitted/active state
  const reportCreateBody = {
    category: "spam",
    reason: RandomGenerator.paragraph({ sentences: 3 }),
    target_article_id: typia.random<string & tags.Format<"uuid">>(),
  } satisfies IDiscussionBoardReport.ICreate;

  const createdReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.memberUser.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(createdReport);

  const initialStatus: string = createdReport.status;
  const initialAction: string = createdReport.action;

  // 3. Register an admin user (adminUser actor) and get an authorized session
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(2),
    bio: null,
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/admin/landing",
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 4. As adminUser, attempt to delete the active report and expect an error
  await TestValidator.error(
    "admin cannot delete an active/unresolved report",
    async () => {
      await api.functional.discussionBoard.adminUser.reports.erase(connection, {
        reportId: createdReport.id,
      });
    },
  );

  // 5. Fetch the report again as adminUser to verify it still exists and is unchanged
  const fetchedReport: IDiscussionBoardReport =
    await api.functional.discussionBoard.adminUser.reports.at(connection, {
      reportId: createdReport.id,
    });
  typia.assert(fetchedReport);

  TestValidator.equals(
    "report id should remain the same after failed delete",
    fetchedReport.id,
    createdReport.id,
  );

  TestValidator.equals(
    "report status should remain unchanged after failed delete",
    fetchedReport.status,
    initialStatus,
  );

  TestValidator.equals(
    "report action should remain unchanged after failed delete",
    fetchedReport.action,
    initialAction,
  );
}
