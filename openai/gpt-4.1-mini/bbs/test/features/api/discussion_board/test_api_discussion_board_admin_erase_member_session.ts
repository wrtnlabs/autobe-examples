import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardDiscussionBoardMember";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMemberSession";

export async function test_api_discussion_board_admin_erase_member_session(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) to obtain admin authentication token
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";

  const admin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        nickname: RandomGenerator.name(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Admin logs in to fully establish session context
  const adminLogin: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        username: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://admin.example.com/login",
        referrer: "https://admin.example.com/",
      } satisfies IDiscussionBoardAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Create a new discussion board member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";

  const member: IDiscussionBoardDiscussionBoardMember =
    await api.functional.discussionBoard.discussionBoardMembers.create(
      connection,
      {
        body: {
          email: memberEmail,
          password: memberPassword,
          nickname: RandomGenerator.name(),
        } satisfies IDiscussionBoardDiscussionBoardMember.ICreate,
      },
    );
  typia.assert(member);

  // 4. Create a session for the member
  const memberSession: IDiscussionBoardMemberSession =
    await api.functional.discussionBoard.member.discussionBoardMembers.sessions.createSession(
      connection,
      {
        discussionBoardMemberId: member.id,
        body: {
          ip: RandomGenerator.mobile(),
          href: "https://discussion.example.com/home",
          referrer: "https://google.com/",
          created_at: new Date().toISOString(),
          expired_at: null,
        } satisfies IDiscussionBoardMemberSession.ICreate,
      },
    );
  typia.assert(memberSession);

  // 5. Admin deletes the member's session
  await api.functional.discussionBoard.admin.discussionBoardMembers.sessions.erase(
    connection,
    {
      discussionBoardMemberId: member.id,
      sessionId: memberSession.id,
    },
  );
}
