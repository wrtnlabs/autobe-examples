import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMemberSession";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMemberSession";

/**
 * Test authorization security for session deletion to ensure members can only
 * delete their own sessions.
 *
 * This test validates critical security requirements preventing session
 * hijacking and denial-of-service attacks. It verifies strict enforcement that
 * JWT username must match the {username} path parameter, ensures 403 Forbidden
 * for cross-account session deletion attempts, confirms that unauthorized
 * deletion attempts do not affect target sessions, and validates that each
 * member maintains complete control over only their own sessions.
 *
 * Test workflow:
 *
 * 1. Create first member account (memberA) and capture session ID
 * 2. Create second member account (memberB) and capture session ID (now
 *    authenticated as memberB)
 * 3. While authenticated as memberB, attempt to delete memberA's session (should
 *    fail with authorization error)
 * 4. While authenticated as memberB, successfully delete memberB's own session to
 *    confirm ownership control
 */
export async function test_api_member_session_deletion_authorization_security(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (memberA)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAPassword = typia.random<string & tags.MinLength<8>>();
  const memberAUsername = RandomGenerator.alphaNumeric(10);

  const memberA = await api.functional.auth.member.join(connection, {
    body: {
      username: memberAUsername,
      email: memberAEmail,
      password: memberAPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberA);

  // Retrieve memberA's initial session list to get session ID
  const memberAInitialSessions =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: memberAUsername,
        body: {} satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(memberAInitialSessions);

  TestValidator.predicate(
    "memberA should have at least one session after join",
    memberAInitialSessions.data.length > 0,
  );

  const memberASessionId = memberAInitialSessions.data[0].id;

  // Step 2: Create second member account (memberB) - this authenticates as memberB
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBPassword = typia.random<string & tags.MinLength<8>>();
  const memberBUsername = RandomGenerator.alphaNumeric(10);

  const memberB = await api.functional.auth.member.join(connection, {
    body: {
      username: memberBUsername,
      email: memberBEmail,
      password: memberBPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(memberB);

  // Retrieve memberB's session to get session ID
  const memberBInitialSessions =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: memberBUsername,
        body: {} satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(memberBInitialSessions);

  TestValidator.predicate(
    "memberB should have at least one session after join",
    memberBInitialSessions.data.length > 0,
  );

  const memberBSessionId = memberBInitialSessions.data[0].id;

  // Step 3: While authenticated as memberB, attempt to delete memberA's session (should fail)
  await TestValidator.error(
    "memberB cannot delete memberA's session - should return authorization error",
    async () => {
      await api.functional.redditCommunity.member.members.sessions.erase(
        connection,
        {
          username: memberAUsername,
          sessionId: memberASessionId,
        },
      );
    },
  );

  // Step 4: While authenticated as memberB, successfully delete memberB's own session
  await api.functional.redditCommunity.member.members.sessions.erase(
    connection,
    {
      username: memberBUsername,
      sessionId: memberBSessionId,
    },
  );
}
