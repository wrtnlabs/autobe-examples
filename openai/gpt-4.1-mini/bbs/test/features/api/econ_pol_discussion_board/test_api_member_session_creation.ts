import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import type { IEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMemberSession";

/**
 * Test creating a new login session for a discussion board member.
 *
 * This test first creates a new member account via the join endpoint,
 * establishing a new user context and obtaining authentication tokens. It then
 * authenticates as that member and posts session information including IP,
 * href, and referrer. The test validates successful creation of the session
 * record and proper handling of session metadata to ensure accurate session
 * context and authorization.
 */
export async function test_api_member_session_creation(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account
  const memberUsername = RandomGenerator.alphabets(8);
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberEmail = `${memberUsername}@example.com`;

  const memberCreateBody = {
    username: memberUsername,
    password: memberPassword,
    email: memberEmail as string & tags.Format<"email">,
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  const memberAuthorized = await api.functional.auth.member.join(connection, {
    body: memberCreateBody,
  });
  typia.assert(memberAuthorized);

  // Step 2: Create a new login session for the member
  const sessionCreateBody = {
    ip: RandomGenerator.alphaNumeric(15),
    href: `https://example.com/login?user=${memberUsername}`,
    referrer: "https://google.com",
  } satisfies IEconPolDiscussionBoardMemberSession.ICreate;

  await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoardMembers.sessions.create(
    connection,
    {
      memberUsername: memberUsername,
      body: sessionCreateBody,
    },
  );
}
