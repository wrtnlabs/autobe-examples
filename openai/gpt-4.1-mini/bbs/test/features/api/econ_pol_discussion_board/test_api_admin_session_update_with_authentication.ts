import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardAdmin";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import type { IEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMemberSession";

/**
 * Test scenario for admin updating a member session record with authentication
 * in econPolDiscussionBoard.
 *
 * Steps:
 *
 * 1. Admin user registration via /auth/admin/join
 * 2. Member user registration via /auth/member/join
 * 3. Create a login session for the member
 * 4. Admin updates the member's session record
 * 5. Validate the updated session data and admin identity
 */
export async function test_api_admin_session_update_with_authentication(
  connection: api.IConnection,
) {
  // 1. Register admin user
  const adminJoinBody = {
    username: RandomGenerator.alphabets(6),
    email: `${RandomGenerator.name(1)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IEconPolDiscussionBoardAdmin.IJoin;
  const admin: IEconPolDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Register member user
  const memberJoinBody = {
    username: RandomGenerator.alphabets(8),
    email: `${RandomGenerator.name(1)}@example.com`,
    password: RandomGenerator.alphaNumeric(10),
  } satisfies IEconPolDiscussionBoardMember.ICreate;
  const member: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberJoinBody,
    });
  typia.assert(member);

  // 3. Create login session for member
  const sessionCreateBody = {
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IEconPolDiscussionBoardMemberSession.ICreate;
  await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoardMembers.sessions.create(
    connection,
    {
      memberUsername: member.username,
      body: sessionCreateBody,
    },
  );

  // 4. Update session with new data
  const sessionUpdateBody = {
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    expired_at: new Date(Date.now() + 3600000).toISOString(),
  } satisfies IEconPolDiscussionBoardMemberSession.IUpdate;

  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const updatedSession =
    await api.functional.econPolDiscussionBoard.admin.econPolDiscussionBoardMembers.sessions.update(
      connection,
      {
        memberUsername: member.username,
        id: sessionId,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  // 5. Validate updated session
  TestValidator.equals(
    "session.memberUsername matches",
    updatedSession.member_username,
    member.username,
  );
  TestValidator.equals(
    "session.ip matches updated value",
    updatedSession.ip ?? null,
    sessionUpdateBody.ip,
  );
  TestValidator.equals(
    "session.href matches updated value",
    updatedSession.href,
    sessionUpdateBody.href,
  );
  TestValidator.equals(
    "session.referrer matches updated value",
    updatedSession.referrer,
    sessionUpdateBody.referrer,
  );
  TestValidator.equals(
    "session.expiredAt matches updated value",
    updatedSession.expired_at ?? null,
    sessionUpdateBody.expired_at,
  );

  // Validate admin user
  TestValidator.predicate(
    "admin.id is string",
    typeof admin.id === "string" && admin.id.length > 0,
  );
  TestValidator.equals("admin.role is 'admin'", admin.role, "admin");
}
