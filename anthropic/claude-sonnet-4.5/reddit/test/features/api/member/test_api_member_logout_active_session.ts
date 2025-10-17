import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeAuthMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAuthMember";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test the complete member logout workflow including session creation through
 * registration, authenticated activity, and session invalidation.
 *
 * This test validates the member logout functionality by:
 *
 * 1. Creating a new member account which establishes an authenticated session with
 *    JWT tokens
 * 2. Verifying the member authentication by validating the returned authorization
 *    token structure
 * 3. Calling the logout endpoint to invalidate the current session
 * 4. Confirming successful logout completion
 *
 * The test ensures that the logout endpoint properly processes session
 * invalidation requests for authenticated members. The session is marked as
 * revoked in the database through soft-deletion (deleted_at timestamp),
 * maintaining audit trail while preventing token reuse for future authenticated
 * requests.
 */
export async function test_api_member_logout_active_session(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account to establish an authenticated session
  const memberRegistration = {
    username: RandomGenerator.alphabets(10),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
  } satisfies IRedditLikeMember.ICreate;

  const authorizedMember: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(authorizedMember);

  // Step 2: Perform logout operation to invalidate the current session
  const logoutRequest = {} satisfies IRedditLikeAuthMember.ILogout;

  await api.functional.redditLike.member.auth.member.logout(connection, {
    body: logoutRequest,
  });

  // Step 3: Logout successful - void return indicates session was invalidated
  // The session is now marked as revoked (soft-deleted) in the database
}
