import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator session refresh functionality.
 *
 * Validates that moderator sessions can be properly refreshed using refresh
 * tokens. The test creates a moderator account, establishes an active session
 * through login, and then extends the session using the refresh endpoint. It
 * verifies that the refreshed session maintains the same moderator identity
 * while generating new tokens with updated expiration times.
 */
export async function test_api_moderator_refresh_valid_session(
  connection: api.IConnection,
) {
  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorDisplayName = RandomGenerator.name();

  const createdModerator = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        display_name: moderatorDisplayName,
        moderator_level: "community",
        is_active: true,
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(createdModerator);

  // 2. Login to establish active session
  const loggedInModerator = await api.functional.auth.moderator.login(
    connection,
    {
      body: {
        email: moderatorEmail,
      } satisfies ICommunityPlatformModerator.ILogin,
    },
  );
  typia.assert(loggedInModerator);

  // Validate login response matches created moderator
  TestValidator.equals(
    "moderator ID should match",
    loggedInModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "email should match",
    loggedInModerator.email,
    createdModerator.email,
  );
  TestValidator.equals(
    "display name should match",
    loggedInModerator.display_name,
    createdModerator.display_name,
  );

  // 3. Refresh session using refresh token
  const refreshedModerator = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: {} satisfies ICommunityPlatformModerator.IRefresh,
    },
  );
  typia.assert(refreshedModerator);

  // 4. Validate refreshed session maintains moderator identity
  TestValidator.equals(
    "moderator ID should remain consistent",
    refreshedModerator.id,
    createdModerator.id,
  );
  TestValidator.equals(
    "email should remain consistent",
    refreshedModerator.email,
    createdModerator.email,
  );
  TestValidator.equals(
    "display name should remain consistent",
    refreshedModerator.display_name,
    createdModerator.display_name,
  );
  TestValidator.equals(
    "moderator level should remain consistent",
    refreshedModerator.moderator_level,
    createdModerator.moderator_level,
  );
  TestValidator.equals(
    "is_active status should remain consistent",
    refreshedModerator.is_active,
    createdModerator.is_active,
  );

  // 5. Validate token structure and time relationships
  TestValidator.predicate(
    "access token should be present",
    refreshedModerator.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token should be present",
    refreshedModerator.token.refresh.length > 0,
  );

  const refreshedExpiredAt = new Date(refreshedModerator.token.expired_at);
  const refreshedRefreshableUntil = new Date(
    refreshedModerator.token.refreshable_until,
  );

  TestValidator.predicate(
    "expired_at should be valid future date",
    refreshedExpiredAt.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until should be valid future date",
    refreshedRefreshableUntil.getTime() > Date.now(),
  );
  TestValidator.predicate(
    "refreshable_until should be after expired_at",
    refreshedRefreshableUntil.getTime() > refreshedExpiredAt.getTime(),
  );

  // 6. Verify tokens are different from previous session (indicating refresh)
  TestValidator.notEquals(
    "access token should be refreshed",
    refreshedModerator.token.access,
    loggedInModerator.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be refreshed",
    refreshedModerator.token.refresh,
    loggedInModerator.token.refresh,
  );
}
