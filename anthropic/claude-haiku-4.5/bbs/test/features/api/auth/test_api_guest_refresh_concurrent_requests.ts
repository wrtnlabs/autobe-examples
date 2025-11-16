import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

export async function test_api_guest_refresh_concurrent_requests(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest session
  const initialGuest: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.join(connection);
  typia.assert(initialGuest);

  TestValidator.predicate(
    "initial guest has valid ID",
    initialGuest.id.length > 0,
  );
  TestValidator.predicate(
    "initial token has access token",
    initialGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial token has refresh token",
    initialGuest.token.refresh.length > 0,
  );

  // Step 2: Create multiple concurrent refresh operations
  const concurrentCount = 5;
  const refreshPromises = ArrayUtil.repeat(concurrentCount, () =>
    api.functional.auth.guest.refresh(connection),
  );

  // Step 3: Execute all refresh operations concurrently
  const refreshResults = await Promise.all(refreshPromises);

  // Step 4: Validate all refresh results completed successfully
  TestValidator.predicate(
    "all concurrent refreshes completed",
    refreshResults.length === concurrentCount,
  );

  // Step 5: Verify each refresh result
  const accessTokens = new Set<string>();
  const refreshTokens = new Set<string>();

  for (let i = 0; i < refreshResults.length; i++) {
    const result = refreshResults[i];
    typia.assert(result);

    TestValidator.predicate(
      `refresh result ${i} has valid guest ID`,
      result.id === initialGuest.id,
    );

    TestValidator.predicate(
      `refresh result ${i} has access token`,
      result.token.access.length > 0,
    );

    TestValidator.predicate(
      `refresh result ${i} has refresh token`,
      result.token.refresh.length > 0,
    );

    TestValidator.predicate(
      `refresh result ${i} has valid expiration`,
      new Date(result.token.expired_at).getTime() > Date.now(),
    );

    TestValidator.predicate(
      `refresh result ${i} has valid refreshable_until`,
      new Date(result.token.refreshable_until).getTime() > Date.now(),
    );

    // Collect tokens to check for conflicts
    accessTokens.add(result.token.access);
    refreshTokens.add(result.token.refresh);
  }

  // Step 6: Verify token uniqueness and consistency
  TestValidator.predicate(
    "all access tokens are unique (no conflicts)",
    accessTokens.size === concurrentCount,
  );

  TestValidator.predicate(
    "all refresh tokens are unique (no conflicts)",
    refreshTokens.size === concurrentCount,
  );

  // Step 7: Perform additional refresh with latest connection state
  const finalRefresh: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.guest.refresh(connection);
  typia.assert(finalRefresh);

  TestValidator.predicate(
    "final refresh maintains guest ID consistency",
    finalRefresh.id === initialGuest.id,
  );

  TestValidator.predicate(
    "final refresh has valid tokens",
    finalRefresh.token.access.length > 0 &&
      finalRefresh.token.refresh.length > 0,
  );
}
