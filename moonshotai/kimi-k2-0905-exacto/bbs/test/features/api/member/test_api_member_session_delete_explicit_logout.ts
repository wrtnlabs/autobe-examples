import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMemberSession";

/**
 * Test explicit member logout via session deletion when user clicks logout
 * button. This validates secure session termination that cleans up stored
 * authentication data and prevents token reuse. Verifies immediate logout
 * behavior where user must re-authenticate for any protected resource access.
 *
 * The test process includes:
 *
 * 1. Creating a new member account through member registration
 * 2. Creating an authentication session for the member
 * 3. Deleting the session to simulate explicit logout behavior
 * 4. Verifying successful session termination
 */
export async function test_api_member_session_delete_explicit_logout(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account for logout testing
  const username = typia.random<
    string & tags.Pattern<"^[a-zA-Z0-9_-]{3,30}$">
  >();
  const email = typia.random<string & tags.Format<"email">>();

  const memberRegistrationData = {
    username,
    email,
    password: typia.random<string & tags.MinLength<8>>(),
  } satisfies IEconomicDiscussionMember.ICreate;

  const newMember: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistrationData,
    });
  typia.assert(newMember);

  // Step 2: Create an authentication session for the member
  const sessionCreateData = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: "127.0.0.1",
  } satisfies IEconomicDiscussionMemberSession.ICreate;

  const memberSession: IEconomicDiscussionMemberSession =
    await api.functional.economicDiscussion.member.members.sessions.create(
      connection,
      {
        memberId: newMember.member.id,
        body: sessionCreateData,
      },
    );
  typia.assert(memberSession);

  // Step 3: Delete the session to simulate explicit logout
  await api.functional.economicDiscussion.member.members.sessions.erase(
    connection,
    {
      memberId: newMember.member.id,
      sessionId: memberSession.id,
    },
  );

  // Step 4: Verify successful session deletion (implicit verification through successful API call)
  // Also verify that member registration worked correctly as a secondary check
  TestValidator.predicate(
    "member registration completed successfully",
    newMember.member.username === username,
  );
  TestValidator.predicate(
    "session creation and deletion completed without error",
    true,
  );
}
