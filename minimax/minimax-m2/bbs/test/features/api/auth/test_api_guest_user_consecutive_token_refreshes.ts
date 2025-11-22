import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionGuestUser";

export async function test_api_guest_user_consecutive_token_refreshes(
  connection: api.IConnection,
) {
  // Step 1: Create guest user account to obtain initial refresh token
  const initialUser = await api.functional.auth.guestUser.join(connection, {
    body: {
      display_name: RandomGenerator.name(),
      email: typia.random<string & tags.Format<"email">>(),
      bio: RandomGenerator.paragraph(),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEconPoliticalDiscussionGuestUser.ICreate,
  });
  typia.assert(initialUser);

  // Step 2: Store initial token information for comparison
  const initialAccessToken = initialUser.token.access;
  const initialRefreshToken = initialUser.token.refresh;
  const initialRefreshableUntil = initialUser.token.refreshable_until;
  const initialExpiredAt = initialUser.token.expired_at;

  TestValidator.equals(
    "initial user should have valid tokens",
    initialUser.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "initial user should have refresh token",
    initialUser.token.refresh.length > 0,
    true,
  );
  TestValidator.equals(
    "initial user should have expiration time",
    initialUser.token.expired_at.length > 0,
    true,
  );
  TestValidator.equals(
    "initial user should have refreshable until time",
    initialUser.token.refreshable_until.length > 0,
    true,
  );

  // Step 3: Perform first token refresh
  const firstRefresh =
    await api.functional.auth.guestUser.refresh.refreshToken(connection);
  typia.assert(firstRefresh);

  // Step 4: Validate first refresh results
  TestValidator.notEquals(
    "first refresh access token should be different",
    firstRefresh.token.access,
    initialAccessToken,
  );
  TestValidator.notEquals(
    "first refresh refresh token should be different",
    firstRefresh.token.refresh,
    initialRefreshToken,
  );
  TestValidator.equals(
    "user ID should remain consistent after first refresh",
    firstRefresh.id,
    initialUser.id,
  );
  TestValidator.equals(
    "display name should remain consistent after first refresh",
    firstRefresh.display_name,
    initialUser.display_name,
  );
  TestValidator.equals(
    "email should remain consistent after first refresh",
    firstRefresh.email,
    initialUser.email,
  );
  TestValidator.equals(
    "status should remain consistent after first refresh",
    firstRefresh.status,
    initialUser.status,
  );

  // Step 5: Verify token expiration times are extended
  const firstExpiredAt = new Date(firstRefresh.token.expired_at);
  const initialExpiredAtDate = new Date(initialExpiredAt);
  TestValidator.predicate(
    "first refresh should extend access token expiration",
    firstExpiredAt > initialExpiredAtDate,
  );

  const firstRefreshableUntil = new Date(firstRefresh.token.refreshable_until);
  const initialRefreshableUntilDate = new Date(initialRefreshableUntil);
  TestValidator.predicate(
    "first refresh should extend refresh token expiration",
    firstRefreshableUntil >= initialRefreshableUntilDate,
  );

  // Step 6: Perform second consecutive token refresh
  const secondRefresh =
    await api.functional.auth.guestUser.refresh.refreshToken(connection);
  typia.assert(secondRefresh);

  // Step 7: Validate second refresh results
  TestValidator.notEquals(
    "second refresh access token should be different from first",
    secondRefresh.token.access,
    firstRefresh.token.access,
  );
  TestValidator.notEquals(
    "second refresh refresh token should be different from first",
    secondRefresh.token.refresh,
    firstRefresh.token.refresh,
  );
  TestValidator.equals(
    "user identity should remain consistent after second refresh",
    secondRefresh.id,
    initialUser.id,
  );
  TestValidator.equals(
    "user profile should remain consistent after second refresh",
    secondRefresh.display_name,
    initialUser.display_name,
  );

  // Step 8: Verify second token expiration extension
  const secondExpiredAt = new Date(secondRefresh.token.expired_at);
  TestValidator.predicate(
    "second refresh should further extend access token expiration",
    secondExpiredAt > firstExpiredAt,
  );

  // Step 9: Perform third consecutive token refresh
  const thirdRefresh =
    await api.functional.auth.guestUser.refresh.refreshToken(connection);
  typia.assert(thirdRefresh);

  // Step 10: Validate third refresh results
  TestValidator.notEquals(
    "third refresh access token should be different from second",
    thirdRefresh.token.access,
    secondRefresh.token.access,
  );
  TestValidator.notEquals(
    "third refresh refresh token should be different from second",
    thirdRefresh.token.refresh,
    secondRefresh.token.refresh,
  );
  TestValidator.equals(
    "user session should remain consistent after third refresh",
    thirdRefresh.id,
    initialUser.id,
  );

  // Step 11: Verify final token expiration
  const thirdExpiredAt = new Date(thirdRefresh.token.expired_at);
  TestValidator.predicate(
    "third refresh should extend expiration even further",
    thirdExpiredAt > secondExpiredAt,
  );

  // Step 12: Test rapid consecutive refreshes (stress test)
  const rapidRefreshes = await Promise.all([
    api.functional.auth.guestUser.refresh.refreshToken(connection),
    api.functional.auth.guestUser.refresh.refreshToken(connection),
    api.functional.auth.guestUser.refresh.refreshToken(connection),
  ]);

  // Validate all rapid refresh results
  for (let i = 0; i < rapidRefreshes.length; i++) {
    const refresh = rapidRefreshes[i];
    typia.assert(refresh);

    TestValidator.equals(
      `rapid refresh ${i + 1} should maintain user identity`,
      refresh.id,
      initialUser.id,
    );
    TestValidator.equals(
      `rapid refresh ${i + 1} should maintain user profile`,
      refresh.display_name,
      initialUser.display_name,
    );
    TestValidator.equals(
      `rapid refresh ${i + 1} should have valid tokens`,
      refresh.token.access.length > 0,
      true,
    );
  }

  // Step 13: Verify that all rapid refresh tokens are unique
  const accessTokens = rapidRefreshes.map((r) => r.token.access);
  const refreshTokens = rapidRefreshes.map((r) => r.token.refresh);

  for (let i = 0; i < accessTokens.length; i++) {
    for (let j = i + 1; j < accessTokens.length; j++) {
      TestValidator.notEquals(
        `access token ${i + 1} should differ from ${j + 1}`,
        accessTokens[i],
        accessTokens[j],
      );
      TestValidator.notEquals(
        `refresh token ${i + 1} should differ from ${j + 1}`,
        refreshTokens[i],
        refreshTokens[j],
      );
    }
  }

  // Step 14: Final validation - ensure the session is still valid and functional
  const finalUser =
    await api.functional.auth.guestUser.refresh.refreshToken(connection);
  typia.assert(finalUser);

  TestValidator.equals(
    "final user identity should still match original",
    finalUser.id,
    initialUser.id,
  );
  TestValidator.equals(
    "final user should still be active",
    finalUser.status,
    "active",
  );
  TestValidator.equals(
    "final user should have valid updated tokens",
    finalUser.token.access.length > 0,
    true,
  );
}
