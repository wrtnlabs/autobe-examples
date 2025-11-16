import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator logout with an active session.
 *
 * This test validates the complete moderator logout workflow:
 *
 * 1. Create a moderator account with initial authentication
 * 2. Verify the moderator receives valid JWT tokens
 * 3. Call logout endpoint to terminate the active session
 * 4. Confirm logout response contains correct moderator ID
 * 5. Verify logout_at timestamp is properly recorded
 * 6. Validate success message indicates session termination
 *
 * This ensures proper session lifecycle management and prevents unauthorized
 * access after logout.
 */
export async function test_api_moderator_logout_with_active_session(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account with authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const joinedModerator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: moderatorUsername,
        password: moderatorPassword,
        href: "https://example.com/moderator/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });

  // Step 2: Validate moderator account creation
  typia.assert(joinedModerator);
  TestValidator.equals(
    "moderator email matches",
    joinedModerator.email,
    moderatorEmail,
  );
  TestValidator.equals(
    "moderator username matches",
    joinedModerator.username,
    moderatorUsername,
  );
  TestValidator.predicate(
    "moderator account is active",
    joinedModerator.account_status === "active",
  );

  // Step 3: Verify JWT tokens are issued
  const token: ICommunityPlatformMember = joinedModerator.token;
  typia.assert(token);
  TestValidator.predicate("access token exists", token.access.length > 0);
  TestValidator.predicate("refresh token exists", token.refresh.length > 0);

  // Step 4: Call logout endpoint with active session
  const logoutResponse: ICommunityPlatformModerator.ILogoutResponse =
    await api.functional.communityPlatform.moderator.auth.moderator.logout(
      connection,
    );

  // Step 5: Validate logout response
  typia.assert(logoutResponse);
  TestValidator.equals(
    "logout response moderator ID matches",
    logoutResponse.id,
    joinedModerator.id,
  );

  // Step 6: Verify logout timestamp is valid
  TestValidator.predicate(
    "logout_at timestamp is valid ISO format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(logoutResponse.logout_at),
  );

  // Step 7: Verify success message indicates session termination
  TestValidator.predicate(
    "logout message indicates successful session termination",
    logoutResponse.message.length > 0 &&
      (logoutResponse.message.toLowerCase().includes("logout") ||
        logoutResponse.message.toLowerCase().includes("session")),
  );
}
