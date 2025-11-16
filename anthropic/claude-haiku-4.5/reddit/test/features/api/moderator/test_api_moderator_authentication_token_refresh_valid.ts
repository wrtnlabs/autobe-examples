import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_authentication_token_refresh_valid(
  connection: api.IConnection,
) {
  // Step 1: Create a new moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.alphabets(8);
  const moderatorPassword = RandomGenerator.alphaNumeric(12);

  const joinResponse = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: moderatorUsername,
      password: moderatorPassword,
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(joinResponse);

  const initialAccessToken = joinResponse.token.access;
  const initialRefreshToken = joinResponse.token.refresh;
  const initialExpiredAt = joinResponse.token.expired_at;
  const initialRefreshableUntil = joinResponse.token.refreshable_until;

  // Verify initial tokens are valid
  TestValidator.predicate(
    "initial access token should exist and be non-empty",
    initialAccessToken.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token should exist and be non-empty",
    initialRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "initial expired_at should be in future",
    new Date(initialExpiredAt) > new Date(),
  );
  TestValidator.predicate(
    "initial refreshable_until should be in future",
    new Date(initialRefreshableUntil) > new Date(),
  );

  // Step 2: Use refresh token to obtain new access token
  const refreshResponse = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies ICommunityPlatformModerator.IRefresh,
    },
  );
  typia.assert(refreshResponse);

  const newAccessToken = refreshResponse.token.access;
  const newRefreshToken = refreshResponse.token.refresh;
  const newExpiredAt = refreshResponse.token.expired_at;
  const newRefreshableUntil = refreshResponse.token.refreshable_until;

  // Step 3: Verify new tokens are valid and represent session extension
  TestValidator.predicate(
    "new access token should exist and be non-empty",
    newAccessToken.length > 0,
  );
  TestValidator.predicate(
    "new refresh token should exist and be non-empty",
    newRefreshToken.length > 0,
  );
  TestValidator.predicate(
    "new access token should be different from initial token",
    newAccessToken !== initialAccessToken,
  );
  TestValidator.predicate(
    "new expired_at should be in future",
    new Date(newExpiredAt) > new Date(),
  );
  TestValidator.predicate(
    "new refreshable_until should be in future",
    new Date(newRefreshableUntil) > new Date(),
  );
  TestValidator.predicate(
    "refresh operation should extend session expiration",
    new Date(newRefreshableUntil) > new Date(initialRefreshableUntil),
  );

  // Step 4: Verify moderator information is preserved across refresh
  TestValidator.equals(
    "moderator id should remain same after refresh",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "moderator email should remain same after refresh",
    refreshResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "moderator username should remain same after refresh",
    refreshResponse.username,
    joinResponse.username,
  );
}
