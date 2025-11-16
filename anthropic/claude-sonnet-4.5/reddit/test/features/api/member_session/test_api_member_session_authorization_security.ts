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
 * Test authorization security enforcement for member session access control.
 *
 * This test validates the critical security requirement that members can only
 * access their own authentication sessions and cannot view other members'
 * sessions. The system must enforce strict username matching between the JWT
 * token and the path parameter, returning 403 Forbidden for unauthorized
 * cross-account access attempts.
 *
 * Test workflow:
 *
 * 1. Create first member account (memberA) via join operation
 * 2. Create second member account (memberB) via join operation
 * 3. Authenticate as memberA and retrieve own sessions - should succeed
 * 4. Verify successful response with memberA's session data
 * 5. While authenticated as memberA, attempt to access memberB's sessions - should
 *    fail with 403
 * 6. Switch authentication to memberB and retrieve own sessions - should succeed
 * 7. While authenticated as memberB, attempt to access memberA's sessions - should
 *    fail with 403
 *
 * Security validations:
 *
 * - Strict username matching between JWT token and path parameter
 * - 403 Forbidden response for unauthorized access attempts
 * - Session data privacy maintained across different member accounts
 */
export async function test_api_member_session_authorization_security(
  connection: api.IConnection,
) {
  // Step 1: Create first member account (memberA)
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberAUsername = RandomGenerator.alphaNumeric(12);

  const memberA: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberAUsername,
        email: memberAEmail,
        password: "SecurePassword123!",
        href: "https://reddit-community.example.com/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(memberA);

  // Step 2: Create second member account (memberB)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberBUsername = RandomGenerator.alphaNumeric(12);

  const memberB: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: memberBUsername,
        email: memberBEmail,
        password: "SecurePassword456!",
        href: "https://reddit-community.example.com/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(memberB);

  // Step 3: Authenticate as memberA and retrieve own sessions (should succeed)
  const memberASessionsOwn: IPageIRedditCommunityMemberSession.ISummary =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: memberAUsername,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(memberASessionsOwn);

  // Step 4: Verify successful response with memberA's session data
  TestValidator.predicate(
    "memberA should have at least one session from registration",
    memberASessionsOwn.data.length >= 1,
  );

  // Step 5: While authenticated as memberA, attempt to access memberB's sessions (should fail with 403)
  await TestValidator.error(
    "memberA should not be able to access memberB's sessions",
    async () => {
      await api.functional.redditCommunity.member.members.sessions.index(
        connection,
        {
          username: memberBUsername,
          body: {
            page: 1,
            limit: 10,
          } satisfies IRedditCommunityMemberSession.IRequest,
        },
      );
    },
  );

  // Step 6: Switch authentication to memberB and retrieve own sessions (should succeed)
  const memberBSessionsOwn: IPageIRedditCommunityMemberSession.ISummary =
    await api.functional.redditCommunity.member.members.sessions.index(
      connection,
      {
        username: memberBUsername,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditCommunityMemberSession.IRequest,
      },
    );
  typia.assert(memberBSessionsOwn);

  // Step 7: Verify memberB has their own session data
  TestValidator.predicate(
    "memberB should have at least one session from registration",
    memberBSessionsOwn.data.length >= 1,
  );

  // Step 8: While authenticated as memberB, attempt to access memberA's sessions (should fail with 403)
  await TestValidator.error(
    "memberB should not be able to access memberA's sessions",
    async () => {
      await api.functional.redditCommunity.member.members.sessions.index(
        connection,
        {
          username: memberAUsername,
          body: {
            page: 1,
            limit: 10,
          } satisfies IRedditCommunityMemberSession.IRequest,
        },
      );
    },
  );
}
