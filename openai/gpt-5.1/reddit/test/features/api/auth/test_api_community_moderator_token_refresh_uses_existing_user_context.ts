import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Validate that community moderator token refresh keeps the same moderator
 * identity and does not switch or create accounts.
 *
 * Business intent:
 *
 * - When a community moderator joins, they receive an authorized context
 *   (IAuthorized) with an access/refresh token bundle.
 * - The refresh endpoint must strictly bind the refresh token to the underlying
 *   moderator identity and active session.
 * - Even if multiple moderator accounts exist, using a refresh token from
 *   moderator A must always yield tokens for moderator A, never moderator B.
 *
 * Test steps:
 *
 * 1. Register first moderator via /auth/communityModerator/join and capture its
 *    IAuthorized payload and refresh token.
 * 2. Register second moderator via /auth/communityModerator/join with different
 *    credentials, and ensure its id differs from the first moderator.
 * 3. Call /auth/communityModerator/refresh using only the first moderator's
 *    refreshToken in IRefresh.
 * 4. Assert that the refreshed IAuthorized.id equals the first moderator's id and
 *    is not equal to the second moderator's id.
 * 5. Optionally perform a second refresh chain call using the newly issued refresh
 *    token to prove identity remains stable across repeated refreshes.
 */
export async function test_api_community_moderator_token_refresh_uses_existing_user_context(
  connection: api.IConnection,
) {
  // 1. Register first moderator and capture its authorized payload
  const firstJoinBody = {
    username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://community.example.com/register",
    referrer: "https://community.example.com/landing",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const firstAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: firstJoinBody,
    });
  typia.assert(firstAuthorized);

  const firstId = firstAuthorized.id;
  const firstToken: IAuthorizationToken = firstAuthorized.token;
  typia.assert(firstToken);

  // 2. Register second moderator with different credentials
  const secondJoinBody = {
    username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
    email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(12),
    display_name: RandomGenerator.name(),
    ip: "127.0.0.2",
    href: "https://community.example.com/register?alt=1",
    referrer: "https://community.example.com/campaign",
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const secondAuthorized: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join(connection, {
      body: secondJoinBody,
    });
  typia.assert(secondAuthorized);

  const secondId = secondAuthorized.id;

  // Ensure the two moderators are distinct
  TestValidator.notEquals(
    "first and second moderator ids must differ",
    firstId,
    secondId,
  );

  // 3. Call refresh using only the first moderator's refresh token
  const refreshBody = {
    refreshToken: firstToken.refresh,
  } satisfies ICommunityPlatformCommunityModerator.IRefresh;

  const refreshed: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  const refreshedId = refreshed.id;

  // 4. Assert identity consistency: refreshed must equal first moderator id
  TestValidator.equals(
    "refreshed moderator id must equal first moderator id",
    refreshedId,
    firstId,
  );

  // and must not equal the second moderator's id
  TestValidator.notEquals(
    "refreshed moderator id must not equal second moderator id",
    refreshedId,
    secondId,
  );

  // 5. Optional: perform another refresh using the newly issued refresh token
  const secondRefreshBody = {
    refreshToken: refreshed.token.refresh,
  } satisfies ICommunityPlatformCommunityModerator.IRefresh;

  const refreshedAgain: ICommunityPlatformCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.refresh(connection, {
      body: secondRefreshBody,
    });
  typia.assert(refreshedAgain);

  const refreshedAgainId = refreshedAgain.id;

  TestValidator.equals(
    "second refresh must still represent the original first moderator id",
    refreshedAgainId,
    firstId,
  );

  TestValidator.notEquals(
    "second refresh must not switch to second moderator id",
    refreshedAgainId,
    secondId,
  );
}
