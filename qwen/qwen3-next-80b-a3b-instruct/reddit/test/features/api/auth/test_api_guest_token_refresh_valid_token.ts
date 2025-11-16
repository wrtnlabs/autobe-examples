import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import type { IGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IGuest";

export async function test_api_guest_token_refresh_valid_token(
  connection: api.IConnection,
) {
  // Step 1: Join as guest to obtain refresh token
  const guestJoinData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "validPassword123",
    href: "https://example.com/join",
    referrer: "https://example.com/home",
  } satisfies IGuest.ICreate;

  const joinedGuest: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: guestJoinData,
    });
  typia.assert(joinedGuest);

  // Step 2: Extract refresh token from the joined guest response
  const refreshToken = joinedGuest.token.refresh;

  // Step 3: Refresh the guest token using the valid refresh token string
  // IGuest.IRequest is defined as a string type, not an object
  const refreshData: IGuest.IRequest = refreshToken;

  const refreshedToken: ICommunityPlatformGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshData,
    });
  typia.assert(refreshedToken);

  // Step 4: Validate that refresh was successful
  // Tokens should be different after refresh - this validates that new tokens were issued
  TestValidator.notEquals(
    "refreshed token access differs from original",
    refreshedToken.token.access,
    joinedGuest.token.access,
  );
  TestValidator.notEquals(
    "refreshed token refresh differs from original",
    refreshedToken.token.refresh,
    joinedGuest.token.refresh,
  );

  // Validate that expiration times have been updated (increased)
  TestValidator.predicate(
    "refresh token expired_at is newer",
    () =>
      new Date(refreshedToken.token.expired_at) >
      new Date(joinedGuest.token.expired_at),
  );
  TestValidator.predicate(
    "refresh token refreshable_until is newer",
    () =>
      new Date(refreshedToken.token.refreshable_until) >
      new Date(joinedGuest.token.refreshable_until),
  );
}
