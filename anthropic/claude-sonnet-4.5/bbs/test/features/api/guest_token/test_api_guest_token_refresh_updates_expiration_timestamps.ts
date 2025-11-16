import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

/**
 * Test that token refresh operation updates expiration timestamps correctly.
 *
 * This test validates that refreshed tokens receive new expiration times rather
 * than inheriting the original token's expiration. Creates a guest account,
 * notes the initial token expiration timestamps, then refreshes the tokens and
 * verifies that the new access token has an updated expired_at timestamp
 * reflecting a fresh validity period. Also confirms that the refreshable_until
 * timestamp is updated if refresh token rotation is implemented, and ensures
 * all timestamps are in valid ISO 8601 format.
 */
export async function test_api_guest_token_refresh_updates_expiration_timestamps(
  connection: api.IConnection,
) {
  // Step 1: Create initial guest account to obtain baseline tokens
  const createBody = {
    ip: typia.random<string>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  const initialGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: createBody,
    });
  typia.assert(initialGuest);

  // Step 2: Capture initial token expiration timestamps
  const initialToken: IAuthorizationToken = initialGuest.token;
  const initialExpiredAt: string = initialToken.expired_at;
  const initialRefreshableUntil: string = initialToken.refreshable_until;
  const initialRefreshToken: string = initialToken.refresh;

  // Validate initial timestamps are in ISO 8601 format
  typia.assert<string & tags.Format<"date-time">>(initialExpiredAt);
  typia.assert<string & tags.Format<"date-time">>(initialRefreshableUntil);

  // Step 3: Wait briefly to ensure time progression
  await new Promise((resolve) => setTimeout(resolve, 100));

  // Step 4: Refresh the tokens using the original refresh token
  const refreshedGuest: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
      } satisfies IDiscussionBoardGuest.IRefresh,
    });
  typia.assert(refreshedGuest);

  // Step 5: Capture new token expiration timestamps
  const refreshedToken: IAuthorizationToken = refreshedGuest.token;
  const refreshedExpiredAt: string = refreshedToken.expired_at;
  const refreshedRefreshableUntil: string = refreshedToken.refreshable_until;

  // Step 6: Validate refreshed timestamps are in ISO 8601 format
  typia.assert<string & tags.Format<"date-time">>(refreshedExpiredAt);
  typia.assert<string & tags.Format<"date-time">>(refreshedRefreshableUntil);

  // Step 7: Verify guest ID remains the same
  TestValidator.equals(
    "guest ID should remain consistent after token refresh",
    refreshedGuest.id,
    initialGuest.id,
  );

  // Step 8: Verify that expired_at timestamp has been updated (is later than initial)
  const initialExpiredDate = new Date(initialExpiredAt);
  const refreshedExpiredDate = new Date(refreshedExpiredAt);

  TestValidator.predicate(
    "refreshed expired_at should be later than initial expired_at",
    refreshedExpiredDate.getTime() > initialExpiredDate.getTime(),
  );

  // Step 9: Verify that refreshable_until timestamp has been updated (is later than initial)
  const initialRefreshableDate = new Date(initialRefreshableUntil);
  const refreshedRefreshableDate = new Date(refreshedRefreshableUntil);

  TestValidator.predicate(
    "refreshed refreshable_until should be later than initial refreshable_until",
    refreshedRefreshableDate.getTime() > initialRefreshableDate.getTime(),
  );

  // Step 10: Verify tokens are different (new tokens were issued)
  TestValidator.notEquals(
    "new access token should be different from initial",
    refreshedToken.access,
    initialToken.access,
  );

  TestValidator.notEquals(
    "new refresh token should be different from initial",
    refreshedToken.refresh,
    initialToken.refresh,
  );
}
