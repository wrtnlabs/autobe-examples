import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";

/**
 * Test that moderators can successfully refresh their tokens multiple times in
 * sequence.
 *
 * This test validates the token rotation mechanism for moderator
 * authentication, ensuring that refresh tokens can be used repeatedly to
 * maintain long-lived sessions. Each refresh operation should return a new set
 * of tokens (both access and refresh), and the refresh tokens should change
 * with each operation (token rotation security).
 *
 * Test workflow:
 *
 * 1. Create a moderator account to obtain initial authentication tokens
 * 2. Perform first token refresh using the initial refresh token
 * 3. Verify new tokens are issued and differ from original tokens
 * 4. Perform second token refresh using the refresh token from first refresh
 * 5. Verify tokens continue to rotate with each refresh operation
 * 6. Validate moderator can continue refreshing indefinitely with most recent
 *    token
 */
export async function test_api_moderator_token_refresh_multiple_times(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account to obtain initial tokens
  const createData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    nickname: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityCommunityModerator.ICreate;

  const initialAuth = await api.functional.auth.moderator.join(connection, {
    body: createData,
  });
  typia.assert(initialAuth);

  // Store initial tokens for comparison
  const initialAccessToken = initialAuth.token.access;
  const initialRefreshToken = initialAuth.token.refresh;

  // Step 2: Perform first token refresh
  const firstRefreshData = {
    refresh_token: initialRefreshToken,
  } satisfies IRedditCommunityCommunityModerator.IRefresh;

  const firstRefreshAuth = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: firstRefreshData,
    },
  );
  typia.assert(firstRefreshAuth);

  // Step 3: Verify new tokens are issued and differ from original
  TestValidator.predicate(
    "first refresh access token differs from initial",
    firstRefreshAuth.token.access !== initialAccessToken,
  );
  TestValidator.predicate(
    "first refresh token differs from initial",
    firstRefreshAuth.token.refresh !== initialRefreshToken,
  );

  // Verify moderator profile data remains consistent
  TestValidator.equals(
    "moderator id consistent after first refresh",
    firstRefreshAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "moderator email consistent after first refresh",
    firstRefreshAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "moderator username consistent after first refresh",
    firstRefreshAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "moderator nickname consistent after first refresh",
    firstRefreshAuth.nickname,
    initialAuth.nickname,
  );

  // Step 4: Perform second token refresh using refresh token from first refresh
  const secondRefreshData = {
    refresh_token: firstRefreshAuth.token.refresh,
  } satisfies IRedditCommunityCommunityModerator.IRefresh;

  const secondRefreshAuth = await api.functional.auth.moderator.refresh(
    connection,
    {
      body: secondRefreshData,
    },
  );
  typia.assert(secondRefreshAuth);

  // Step 5: Verify tokens continue to rotate with second refresh
  TestValidator.predicate(
    "second refresh access token differs from first refresh",
    secondRefreshAuth.token.access !== firstRefreshAuth.token.access,
  );
  TestValidator.predicate(
    "second refresh token differs from first refresh",
    secondRefreshAuth.token.refresh !== firstRefreshAuth.token.refresh,
  );
  TestValidator.predicate(
    "second refresh access token differs from initial",
    secondRefreshAuth.token.access !== initialAccessToken,
  );
  TestValidator.predicate(
    "second refresh token differs from initial",
    secondRefreshAuth.token.refresh !== initialRefreshToken,
  );

  // Step 6: Verify moderator profile data still consistent after second refresh
  TestValidator.equals(
    "moderator id consistent after second refresh",
    secondRefreshAuth.id,
    initialAuth.id,
  );
  TestValidator.equals(
    "moderator email consistent after second refresh",
    secondRefreshAuth.email,
    initialAuth.email,
  );
  TestValidator.equals(
    "moderator username consistent after second refresh",
    secondRefreshAuth.username,
    initialAuth.username,
  );
  TestValidator.equals(
    "moderator nickname consistent after second refresh",
    secondRefreshAuth.nickname,
    initialAuth.nickname,
  );
}
