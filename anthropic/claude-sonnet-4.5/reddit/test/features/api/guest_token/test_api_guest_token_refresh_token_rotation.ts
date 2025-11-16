import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

/**
 * Test that refresh token rotation is properly implemented for security.
 *
 * This test validates the security-critical refresh token rotation mechanism
 * for guest accounts. Token rotation ensures that each refresh token can only
 * be used once, preventing token reuse attacks and enhancing session security.
 *
 * Test flow:
 *
 * 1. Create a new guest account to obtain initial tokens
 * 2. Use the initial refresh token to perform a token refresh
 * 3. Verify that a new refresh token is issued in the response
 * 4. Attempt to reuse the old refresh token for a second refresh
 * 5. Validate that the old refresh token is invalidated and cannot be used
 * 6. Confirm that only the newly issued refresh token works for subsequent
 *    refreshes
 */
export async function test_api_guest_token_refresh_token_rotation(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest account to obtain initial tokens
  const guestData = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IRedditCommunityGuest.ICreate;

  const initialGuest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestData,
    });
  typia.assert(initialGuest);

  // Store the initial refresh token
  const initialRefreshToken: string = initialGuest.token.refresh;
  const initialAccessToken: string = initialGuest.token.access;

  // Step 2: Use the initial refresh token to perform a token refresh
  const firstRefreshResult: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(firstRefreshResult);

  // Step 3: Verify that a new refresh token is issued (token rotation)
  const newRefreshToken: string = firstRefreshResult.token.refresh;
  const newAccessToken: string = firstRefreshResult.token.access;

  TestValidator.predicate(
    "new refresh token should be different from initial refresh token",
    newRefreshToken !== initialRefreshToken,
  );

  TestValidator.predicate(
    "new access token should be different from initial access token",
    newAccessToken !== initialAccessToken,
  );

  // Step 4: Attempt to reuse the old refresh token for a second refresh
  await TestValidator.error(
    "old refresh token should be invalidated and cannot be used again",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: initialRefreshToken,
        } satisfies IRedditCommunityGuest.IRefresh,
      });
    },
  );

  // Step 5: Confirm that only the newly issued refresh token works
  const secondRefreshResult: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: newRefreshToken,
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(secondRefreshResult);

  // Verify the second refresh was successful
  TestValidator.predicate(
    "second refresh with new token should issue another different refresh token",
    secondRefreshResult.token.refresh !== newRefreshToken,
  );

  TestValidator.predicate(
    "guest ID should remain consistent across token refreshes",
    secondRefreshResult.id === initialGuest.id,
  );
}
