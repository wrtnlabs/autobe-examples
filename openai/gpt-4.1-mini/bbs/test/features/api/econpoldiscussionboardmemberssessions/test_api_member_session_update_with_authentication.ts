import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import type { IEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMemberSession";

export async function test_api_member_session_update_with_authentication(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account with random username, password, and email
  const memberRequestBody = {
    username:
      RandomGenerator.name(1).toLowerCase().replace(/\s+/g, "") +
      RandomGenerator.alphaNumeric(4),
    password: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.name(1).toLowerCase()}@example.com`,
  } satisfies IEconPolDiscussionBoardMember.ICreate;
  const memberAuthorized: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRequestBody,
    });
  typia.assert(memberAuthorized);

  // Extract username and token from created member
  const memberUsername: string = memberAuthorized.username;

  // Step 2: Create a session for this member
  const sessionCreateBody = {
    ip: "192.168.1.100",
    href: "https://discussion-board.example.com/login",
    referrer: "https://discussion-board.example.com/",
  } satisfies IEconPolDiscussionBoardMemberSession.ICreate;

  await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoardMembers.sessions.create(
    connection,
    {
      memberUsername,
      body: sessionCreateBody,
    },
  );

  // Step 3: Update the session assuming a hypothetical session id
  // Note: As the create session API returns void, we cannot retrieve the real session ID,
  // so we use a random UUID to test the mechanics of the update API call with proper authentication.

  const sessionId = typia.random<string & tags.Format<"uuid">>();

  const sessionUpdateBody = {
    ip: "203.0.113.42",
    href: "https://discussion-board.example.com/dashboard",
    referrer: "https://discussion-board.example.com/login",
    expired_at: null,
  } satisfies IEconPolDiscussionBoardMemberSession.IUpdate;

  const updatedSession: IEconPolDiscussionBoardMemberSession =
    await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoardMembers.sessions.update(
      connection,
      {
        memberUsername,
        id: sessionId,
        body: sessionUpdateBody,
      },
    );
  typia.assert(updatedSession);

  // Validate that updated properties match request
  TestValidator.predicate(
    "updatedSession.ip should be string or null",
    updatedSession.ip === sessionUpdateBody.ip,
  );
  TestValidator.predicate(
    "updatedSession.href equals updated href",
    updatedSession.href === sessionUpdateBody.href,
  );
  TestValidator.predicate(
    "updatedSession.referrer equals updated referrer",
    updatedSession.referrer === sessionUpdateBody.referrer,
  );
  TestValidator.equals(
    "updatedSession.expired_at equals updated expired_at",
    updatedSession.expired_at,
    sessionUpdateBody.expired_at,
  );
}
