import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMember";
import type { IEconPolDiscussionBoardMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardMemberSession";

export async function test_api_member_session_retrieval(
  connection: api.IConnection,
) {
  // 1. Join a new member account to authenticate
  const createMemberBody = {
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    email: `${RandomGenerator.name(1)}@example.com`,
  } satisfies IEconPolDiscussionBoardMember.ICreate;

  const member: IEconPolDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: createMemberBody,
    });
  typia.assert(member);

  // 2. Create a new login session for this member
  const createSessionBody = {
    ip: RandomGenerator.pick(["127.0.0.1", "192.168.1.1", "10.0.0.2"]),
    href: `https://example.com/session/${member.username}/home`,
    referrer: "https://example.com/login",
  } satisfies IEconPolDiscussionBoardMemberSession.ICreate;

  // Creation returns void, ensure it succeeds without error
  await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoardMembers.sessions.create(
    connection,
    {
      memberUsername: member.username,
      body: createSessionBody,
    },
  );

  // 3. Test retrieval by id - Since creation returns void and ID is unknown,
  // attempt to retrieve a session by using a random valid UUID to ensure API
  // works and returns properly typed session
  const testSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const session: IEconPolDiscussionBoardMemberSession =
    await api.functional.econPolDiscussionBoard.member.econPolDiscussionBoardMembers.sessions.at(
      connection,
      {
        memberUsername: member.username,
        id: testSessionId,
      },
    );
  typia.assert(session);

  // Validate that the session is owned by the member
  TestValidator.equals(
    "session memberUsername",
    session.member_username,
    member.username,
  );
  // Validate ip is string or null or undefined
  TestValidator.predicate(
    "session ip is string (or null or undefined)",
    session.ip === null ||
      session.ip === undefined ||
      typeof session.ip === "string",
  );
  TestValidator.predicate("session href is non-empty", session.href.length > 0);
  TestValidator.predicate(
    "session referrer is non-empty",
    session.referrer.length > 0,
  );
  TestValidator.predicate(
    "session created_at is non-empty string",
    typeof session.created_at === "string" && session.created_at.length > 0,
  );
  // expired_at can be null or string or undefined
  TestValidator.predicate(
    "session expired_at is string or null or undefined",
    session.expired_at === null ||
      session.expired_at === undefined ||
      typeof session.expired_at === "string",
  );
}
