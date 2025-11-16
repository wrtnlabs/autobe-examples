import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";

export async function test_api_guest_access_token_refresh(
  connection: api.IConnection,
) {
  // Step 1: Register a new guest user account to obtain initial authorization tokens
  const joinResponse: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IRedditCommunityGuest.IJoin,
    });
  typia.assert(joinResponse);

  // Validate initial token structure
  const initialToken: IAuthorizationToken = joinResponse.token;
  typia.assert(initialToken);

  // Step 2: Use the refresh token from the join response to refresh the guest access token
  const refreshResponse: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refreshToken: initialToken.refresh,
      } satisfies IRedditCommunityGuest.IRefresh,
    });
  typia.assert(refreshResponse);

  // Validate the new token structure
  const refreshedToken: IAuthorizationToken = refreshResponse.token;
  typia.assert(refreshedToken);

  // Step 3: Verify that the refreshed access token is different from the initial
  // and that expiration timestamps are updated
  TestValidator.notEquals(
    "access token should be refreshed to a new value",
    initialToken.access,
    refreshedToken.access,
  );

  TestValidator.notEquals(
    "refresh token should be refreshed to a new value",
    initialToken.refresh,
    refreshedToken.refresh,
  );

  TestValidator.predicate(
    "expired_at of refreshed token should be later than or equal to initial",
    refreshedToken.expired_at >= initialToken.expired_at,
  );

  TestValidator.predicate(
    "refreshable_until of refreshed token should be later than or equal to initial",
    refreshedToken.refreshable_until >= initialToken.refreshable_until,
  );
}
