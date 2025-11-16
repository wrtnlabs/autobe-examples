import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import type { IEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMemberSession";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconPolDiscussionBoardMemberSession";

export async function test_api_econ_pol_discussion_board_admin_list_member_sessions(
  connection: api.IConnection,
) {
  // 1. Register as admin and authenticate
  const adminJoinBody = {
    username: `admin_${RandomGenerator.alphaNumeric(8)}`,
    email: `admin_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "password1234",
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;
  const admin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create a member account
  const memberCreateBody = {
    username: `member_${RandomGenerator.alphaNumeric(8)}`,
    email: `member_${RandomGenerator.alphaNumeric(6)}@example.com`,
    password: "password1234",
  } satisfies IEconPolDiscussionBoardMember.ICreate;
  const member: IEconPolDiscussionBoardMember =
    await api.functional.econPolDiscussionBoard.econPolDiscussionBoardMembers.create(
      connection,
      { body: memberCreateBody },
    );
  typia.assert(member);

  // 3. Get paged sessions for the created member
  const sessionRequestBody = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    order: "desc" as const,
    sort_by: "created_at",
    search: undefined,
    status: "active",
    created_from: undefined,
    created_to: undefined,
  } satisfies IEconPolDiscussionBoardMemberSession.IRequest;

  const sessionsPage: IPageIEconPolDiscussionBoardMemberSession.ISummary =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardMembers.sessions.index(
      connection,
      { memberUsername: member.username, body: sessionRequestBody },
    );
  typia.assert(sessionsPage);

  TestValidator.predicate(
    "pagination current page is 1",
    sessionsPage.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit matches request",
    sessionsPage.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination current page is <= total pages",
    sessionsPage.pagination.current <= sessionsPage.pagination.pages,
  );

  for (const session of sessionsPage.data) {
    typia.assert(session);
    TestValidator.predicate(
      "session id is UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        session.id,
      ),
    );
    TestValidator.predicate(
      "session ip is non-empty string",
      session.ip.length > 0,
    );
    TestValidator.predicate(
      "session href is non-empty string",
      session.href.length > 0,
    );
    TestValidator.predicate(
      "session referrer is string present",
      typeof session.referrer === "string",
    );
    TestValidator.predicate(
      "session created_at is a date",
      !isNaN(Date.parse(session.created_at)),
    );
  }

  const filteredRequestBody = {
    ...sessionRequestBody,
    search: member.username,
    page: 1,
    limit: 5,
  } satisfies IEconPolDiscussionBoardMemberSession.IRequest;
  const filteredSessions =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardMembers.sessions.index(
      connection,
      { memberUsername: member.username, body: filteredRequestBody },
    );
  typia.assert(filteredSessions);

  TestValidator.predicate(
    "filtered results are less or equal limit",
    filteredSessions.data.length <= 5,
  );
  TestValidator.equals(
    "filtered first page current is 1",
    1,
    filteredSessions.pagination.current,
  );
}
