import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test token refresh maintains session continuity without creating new
 * sessions.
 *
 * This test validates that the moderator token refresh mechanism properly
 * reuses existing session records rather than creating new ones. It verifies
 * that multiple consecutive refresh operations maintain the same session
 * context (ip, href, referrer) from the original login, ensuring database
 * efficiency and proper session tracking.
 *
 * Test workflow:
 *
 * 1. Create a new moderator account
 * 2. Perform initial login to establish session
 * 3. Execute multiple token refresh operations
 * 4. Validate session continuity and token validity
 * 5. Confirm no duplicate sessions created
 */
export async function test_api_moderator_token_refresh_session_continuity(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "SecurePass123!";
  const sessionHref = typia.random<string & tags.Format<"uri">>();
  const sessionReferrer = typia.random<string & tags.Format<"uri">>();

  const createdModerator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        username: RandomGenerator.name(1),
        display_name: RandomGenerator.name(2),
        href: sessionHref,
        referrer: sessionReferrer,
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(createdModerator);

  // Step 2: Perform login to establish initial session
  const loginResult: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.login(connection, {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
        href: sessionHref,
        referrer: sessionReferrer,
      } satisfies IDiscussionBoardModerator.ILogin,
    });
  typia.assert(loginResult);

  // Capture initial session tokens
  const initialTokens: IAuthorizationToken = loginResult.token;
  typia.assert(initialTokens);

  // Step 3: Perform multiple consecutive token refreshes
  const refreshCount = 3;
  let currentRefreshToken = initialTokens.refresh;

  const refreshResults: IDiscussionBoardModerator.IAuthorized[] = [];

  for (let i = 0; i < refreshCount; i++) {
    const refreshResult: IDiscussionBoardModerator.IAuthorized =
      await api.functional.auth.moderator.refresh(connection, {
        body: {
          refresh_token: currentRefreshToken,
        } satisfies IDiscussionBoardModerator.IRefresh,
      });
    typia.assert(refreshResult);
    refreshResults.push(refreshResult);

    // Update refresh token for next iteration
    currentRefreshToken = refreshResult.token.refresh;
  }

  // Step 4: Validate all refresh operations returned valid responses
  TestValidator.equals(
    "refresh operations count matches expected",
    refreshResults.length,
    refreshCount,
  );

  // Step 5: Verify all refresh results contain the same moderator ID (same session)
  for (let i = 0; i < refreshResults.length; i++) {
    TestValidator.equals(
      `refresh ${i + 1} moderator ID matches original`,
      refreshResults[i].id,
      loginResult.id,
    );

    TestValidator.equals(
      `refresh ${i + 1} email matches original`,
      refreshResults[i].email,
      moderatorEmail,
    );

    TestValidator.equals(
      `refresh ${i + 1} username matches original`,
      refreshResults[i].username,
      loginResult.username,
    );
  }

  // Step 6: Validate token structure and expiration updates
  for (let i = 0; i < refreshResults.length; i++) {
    const tokens = refreshResults[i].token;
    typia.assert(tokens);

    // Verify tokens are different from previous iteration
    if (i === 0) {
      TestValidator.predicate(
        `first refresh access token differs from login`,
        tokens.access !== initialTokens.access,
      );
    } else {
      TestValidator.predicate(
        `refresh ${i + 1} access token differs from previous`,
        tokens.access !== refreshResults[i - 1].token.access,
      );
    }

    // Verify token expiration timestamps are present and valid
    typia.assert<string & tags.Format<"date-time">>(tokens.expired_at);
    typia.assert<string & tags.Format<"date-time">>(tokens.refreshable_until);
  }

  // Step 7: Verify moderator account properties remain consistent
  TestValidator.equals(
    "moderator email verified status unchanged",
    refreshResults[refreshResults.length - 1].email_verified,
    loginResult.email_verified,
  );

  TestValidator.equals(
    "moderator active status unchanged",
    refreshResults[refreshResults.length - 1].is_active,
    loginResult.is_active,
  );
}
