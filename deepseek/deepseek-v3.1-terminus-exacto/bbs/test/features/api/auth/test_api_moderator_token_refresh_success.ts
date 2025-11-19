import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test successful token refresh operation for moderator authentication.
 *
 * This test validates the complete token refresh workflow including moderator
 * account creation, initial authentication, and token refresh functionality.
 * The test ensures that refresh tokens can be used to obtain new access tokens
 * while maintaining moderator identity and session continuity.
 */
export async function test_api_moderator_token_refresh_success(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "testPassword123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(),
      password: moderatorPassword,
      moderation_level: "basic",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Verify initial authentication worked
  TestValidator.equals(
    "moderator email matches input",
    moderator.email,
    moderatorEmail,
  );
  TestValidator.predicate(
    "moderator has valid token",
    moderator.token !== undefined,
  );

  // Step 2: Use refresh token to obtain new tokens
  const refreshedModerator = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: {
        refresh_token: moderator.token.refresh,
      } satisfies IDiscussionBoardModerator.IRefresh,
    },
  );
  typia.assert(refreshedModerator);

  // Step 3: Validate refresh operation
  TestValidator.equals(
    "moderator ID remains consistent after refresh",
    refreshedModerator.id,
    moderator.id,
  );
  TestValidator.equals(
    "moderator email remains consistent after refresh",
    refreshedModerator.email,
    moderator.email,
  );
  TestValidator.equals(
    "moderator username remains consistent after refresh",
    refreshedModerator.username,
    moderator.username,
  );
  TestValidator.equals(
    "moderator moderation level remains consistent after refresh",
    refreshedModerator.moderation_level,
    moderator.moderation_level,
  );

  // Step 4: Validate token rotation
  TestValidator.notEquals(
    "access token changes after refresh",
    refreshedModerator.token.access,
    moderator.token.access,
  );
  TestValidator.notEquals(
    "refresh token changes after refresh",
    refreshedModerator.token.refresh,
    moderator.token.refresh,
  );
  TestValidator.notEquals(
    "expiration timestamp changes after refresh",
    refreshedModerator.token.expired_at,
    moderator.token.expired_at,
  );
  TestValidator.notEquals(
    "refreshable until timestamp changes after refresh",
    refreshedModerator.token.refreshable_until,
    moderator.token.refreshable_until,
  );

  // Step 5: Verify refreshed tokens are properly formatted
  TestValidator.predicate(
    "refreshed access token is non-empty string",
    refreshedModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token is non-empty string",
    refreshedModerator.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "refreshed expired_at is valid timestamp",
    refreshedModerator.token.expired_at.length > 0,
  );
  TestValidator.predicate(
    "refreshed refreshable_until is valid timestamp",
    refreshedModerator.token.refreshable_until.length > 0,
  );
}
