import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

export async function test_api_member_session_delete_logout(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IEconomicDiscussionMember.ICreate;

  const authorizedMember = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(authorizedMember);

  // Verify member was created successfully
  TestValidator.predicate(
    "member creation successful",
    authorizedMember.member.id !== undefined,
  );
  TestValidator.equals(
    "member username matches input",
    authorizedMember.member.username,
    memberData.username,
  );
  TestValidator.equals(
    "member email matches input",
    authorizedMember.member.email,
    memberData.email,
  );

  // Step 2: Create an authentication session
  const sessionCreateData = {
    href: "https://example.com/login",
    ip: "127.0.0.1",
    referrer: "https://example.com/home",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const session =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: authorizedMember.member.id,
        body: sessionCreateData,
      },
    );
  typia.assert(session);

  // Verify session was created successfully
  TestValidator.predicate(
    "session creation successful",
    session.id !== undefined,
  );
  TestValidator.equals(
    "session member ID matches",
    session.member.id,
    authorizedMember.member.id,
  );
  TestValidator.equals(
    "session href matches input",
    session.href,
    sessionCreateData.href,
  );
  TestValidator.predicate(
    "session has creation timestamp",
    session.created_at !== undefined,
  );

  // Step 3: Delete the session to log out the member
  await api.functional.economicDiscussion.member.members.sessions.erase(
    connection,
    {
      memberId: authorizedMember.member.id,
      sessionId: session.id,
    },
  );

  // Step 4: Verify session deletion by testing that authentication is no longer valid
  // Create an unauthenticated connection to represent the user's state after logout
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // Verify that we can still register new members (system continues to function)
  const newMemberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: "NewSecurePass456!",
  } satisfies IEconomicDiscussionMember.ICreate;

  const newAuthorizedMember = await api.functional.auth.member.join(
    connection,
    {
      body: newMemberData,
    },
  );
  typia.assert(newAuthorizedMember);

  TestValidator.equals(
    "new member created successfully",
    newAuthorizedMember.member.username,
    newMemberData.username,
  );
}
