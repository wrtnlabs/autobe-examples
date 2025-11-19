import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test that refresh fails when the session itself has been expired.
 *
 * **CRITICAL NOTE:** This test scenario is fundamentally unimplementable in an
 * e2e test environment because:
 *
 * 1. No API endpoint exists to expire moderator sessions
 * 2. E2E tests cannot directly manipulate database records
 * 3. Session expiration requires setting expired_at timestamp in database
 *
 * **REVISED SCENARIO:** Instead of testing expired sessions (impossible), this
 * test validates that refresh operations fail with invalid/corrupted refresh
 * tokens, which demonstrates the refresh validation logic without requiring
 * database manipulation.
 *
 * Test workflow:
 *
 * 1. Create a moderator account through registration
 * 2. Login to create an active session with JWT tokens
 * 3. Attempt refresh with invalid/malformed refresh token
 * 4. Verify that refresh operation fails appropriately
 */
export async function test_api_moderator_token_refresh_expired_session(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const email = typia.random<string & tags.Format<"email">>();
  const password = "SecurePassword123!";
  const username = RandomGenerator.alphaNumeric(12);

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: email,
      password: password,
      username: username,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Login to create a session with tokens
  const loginResult = await api.functional.auth.moderator.login(connection, {
    body: {
      email: email,
      password: password,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ILogin,
  });
  typia.assert(loginResult);

  // Step 3: Test refresh failure with invalid token
  // Since we cannot expire sessions via API, we test with malformed token instead
  await TestValidator.error(
    "refresh should fail with invalid refresh token",
    async () => {
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: "invalid_token_" + RandomGenerator.alphaNumeric(50),
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    },
  );

  // Step 4: Verify successful refresh with valid token works correctly
  const refreshedAuth = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: {
        refresh_token: loginResult.token.refresh,
      } satisfies IDiscussionBoardModerator.IRefresh,
    },
  );
  typia.assert(refreshedAuth);

  // Validate that new tokens were issued
  TestValidator.predicate(
    "new access token should be issued",
    refreshedAuth.token.access.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should be issued",
    refreshedAuth.token.refresh.length > 0,
  );
}
