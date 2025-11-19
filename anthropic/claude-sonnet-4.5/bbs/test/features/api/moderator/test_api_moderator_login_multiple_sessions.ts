import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that moderators can have multiple concurrent active sessions.
 *
 * This test validates that moderators can maintain multiple concurrent active
 * sessions from different contexts (different IP addresses, different href
 * URLs). The test creates a moderator account and performs multiple login
 * operations with varying connection contexts to ensure each login creates a
 * separate session record in discussion_board_moderator_sessions. Each session
 * should have distinct session IDs, valid access and refresh tokens, and all
 * sessions should remain active (expired_at is null). This confirms that
 * moderators can be logged in from multiple devices or browser instances
 * simultaneously without invalidating previous sessions.
 *
 * Test steps:
 *
 * 1. Create a moderator account with initial session context
 * 2. Perform first login with context A (IP: 192.168.1.1, href:
 *    https://example.com/login)
 * 3. Perform second login with context B (IP: 192.168.1.2, href:
 *    https://example.com/admin)
 * 4. Perform third login with context C (IP: 10.0.0.1, href:
 *    https://example.com/dashboard)
 * 5. Validate that each login returns unique access tokens
 * 6. Validate that each login returns unique refresh tokens
 * 7. Ensure all returned moderator profiles are consistent
 */
export async function test_api_moderator_login_multiple_sessions(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePassword123!";
  const moderatorUsername = RandomGenerator.alphaNumeric(12);

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: moderatorUsername,
        display_name: RandomGenerator.name(),
        ip: "192.168.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Store the initial token from registration
  const initialToken = createdModerator.token;
  typia.assert(initialToken);

  // Step 2: Perform first login with context A
  const loginSession1: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "192.168.1.1",
        href: "https://example.com/login" satisfies string & tags.Format<"uri">,
        referrer: "https://example.com" satisfies string & tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loginSession1);

  // Step 3: Perform second login with context B
  const loginSession2: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "192.168.1.2",
        href: "https://example.com/admin" satisfies string & tags.Format<"uri">,
        referrer: "https://example.com/home" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loginSession2);

  // Step 4: Perform third login with context C
  const loginSession3: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        ip: "10.0.0.1",
        href: "https://example.com/dashboard" satisfies string &
          tags.Format<"uri">,
        referrer: "https://example.com/settings" satisfies string &
          tags.Format<"uri">,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loginSession3);

  // Step 5: Validate that each login returns unique access tokens
  const accessTokens = [
    initialToken.access,
    loginSession1.token.access,
    loginSession2.token.access,
    loginSession3.token.access,
  ];

  const uniqueAccessTokens = new Set(accessTokens);
  TestValidator.predicate(
    "all access tokens should be unique",
    uniqueAccessTokens.size === accessTokens.length,
  );

  // Step 6: Validate that each login returns unique refresh tokens
  const refreshTokens = [
    initialToken.refresh,
    loginSession1.token.refresh,
    loginSession2.token.refresh,
    loginSession3.token.refresh,
  ];

  const uniqueRefreshTokens = new Set(refreshTokens);
  TestValidator.predicate(
    "all refresh tokens should be unique",
    uniqueRefreshTokens.size === refreshTokens.length,
  );

  // Step 7: Ensure all returned moderator profiles are consistent
  TestValidator.equals(
    "first login moderator id matches created moderator",
    loginSession1.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "second login moderator id matches created moderator",
    loginSession2.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "third login moderator id matches created moderator",
    loginSession3.id,
    createdModerator.id,
  );

  TestValidator.equals(
    "first login email matches created moderator",
    loginSession1.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "second login email matches created moderator",
    loginSession2.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "third login email matches created moderator",
    loginSession3.email,
    moderatorEmail,
  );

  TestValidator.equals(
    "first login username matches created moderator",
    loginSession1.username,
    moderatorUsername,
  );

  TestValidator.equals(
    "second login username matches created moderator",
    loginSession2.username,
    moderatorUsername,
  );

  TestValidator.equals(
    "third login username matches created moderator",
    loginSession3.username,
    moderatorUsername,
  );
}
