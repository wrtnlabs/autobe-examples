import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";

/**
 * Verify successful community moderator registration and token issuance.
 *
 * Business purpose:
 *
 * - Ensure that the public join endpoint for community moderators can
 *   successfully create a new moderator account without prior authentication.
 * - Validate that a newly registered moderator receives an authorized moderator
 *   context and an IAuthorizationToken bundle for immediate authenticated
 *   operations.
 *
 * Scenario steps:
 *
 * 1. Build a realistic ICommunityPlatformCommunityModerator.IJoin payload with
 *    unique email/username, strong password, and contextual href and referrer
 *    URIs.
 * 2. Call POST /auth/communityModerator/join via
 *    api.functional.auth.communityModerator.join.
 * 3. Assert the response matches ICommunityPlatformCommunityModerator.IAuthorized
 *    using typia.assert.
 * 4. Validate that:
 *
 *    - The moderator id is a non-empty UUID string.
 *    - The token.access and token.refresh are non-empty strings.
 *    - Expired_at and refreshable_until are future ISO date-time strings.
 * 5. Optionally register a second moderator to ensure independent accounts and
 *    tokens are issued.
 */
export async function test_api_community_moderator_join_success(
  connection: api.IConnection,
) {
  // 1. Prepare first join payload matching IJoin
  const joinBody1 = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  // 2. Call join endpoint for first moderator
  const authorized1 = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody1,
    },
  );

  // 3. Type-level validation of response
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(authorized1);

  // 4. Business-level validations for first moderator
  // 4-1. Non-empty UUID id (UUID format guaranteed by typia.assert already)
  TestValidator.predicate(
    "first moderator id should be non-empty",
    authorized1.id.length > 0,
  );

  // 4-2. Token fields should be non-empty strings
  TestValidator.predicate(
    "first moderator access token should be non-empty",
    authorized1.token.access.length > 0,
  );
  TestValidator.predicate(
    "first moderator refresh token should be non-empty",
    authorized1.token.refresh.length > 0,
  );

  // 4-3. expired_at and refreshable_until should be future times
  const now = new Date();
  const expiredAt1 = new Date(authorized1.token.expired_at);
  const refreshableUntil1 = new Date(authorized1.token.refreshable_until);

  TestValidator.predicate(
    "first moderator access token expiry should be in the future",
    expiredAt1.getTime() > now.getTime(),
  );
  TestValidator.predicate(
    "first moderator refresh token expiry should be in the future",
    refreshableUntil1.getTime() > now.getTime(),
  );

  // 5. Optionally register a second moderator to ensure independent accounts
  const joinBody2 = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformCommunityModerator.IJoin;

  const authorized2 = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: joinBody2,
    },
  );
  typia.assert<ICommunityPlatformCommunityModerator.IAuthorized>(authorized2);

  // Ensure second moderator has a different id and token bundle.
  TestValidator.notEquals(
    "second moderator id should differ from first",
    authorized2.id,
    authorized1.id,
  );
  TestValidator.notEquals(
    "second moderator access token should differ from first",
    authorized2.token.access,
    authorized1.token.access,
  );
  TestValidator.notEquals(
    "second moderator refresh token should differ from first",
    authorized2.token.refresh,
    authorized1.token.refresh,
  );
}
