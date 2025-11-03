import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuestSession";

export async function test_api_guest_refresh_token_success(
  connection: api.IConnection,
) {
  // Step 1: Create a new guest user to obtain tokens
  const guest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {} satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(guest);

  // Step 2: Validate initial tokens
  TestValidator.predicate(
    "initial access token issued",
    typeof guest.token.access === "string" && guest.token.access.length > 0,
  );
  TestValidator.predicate(
    "initial refresh token issued",
    typeof guest.token.refresh === "string" && guest.token.refresh.length > 0,
  );

  // Step 3: Prepare refresh request body
  // Using dummy example URLs for href and referrer as required
  const refreshBody = {
    href: "https://example.com/current-page",
    referrer: "https://example.com/referrer-page",
  } satisfies IRedditCommunityGuest.IRefresh;

  // Step 4: Perform the token refresh
  const refreshedGuest: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedGuest);

  // Step 5: Validate that new tokens are issued and differ from the initial ones
  TestValidator.predicate(
    "refreshed access token issued",
    typeof refreshedGuest.token.access === "string" &&
      refreshedGuest.token.access.length > 0,
  );
  TestValidator.predicate(
    "refreshed refresh token issued",
    typeof refreshedGuest.token.refresh === "string" &&
      refreshedGuest.token.refresh.length > 0,
  );
  TestValidator.notEquals(
    "access token changed after refresh",
    guest.token.access,
    refreshedGuest.token.access,
  );
  TestValidator.notEquals(
    "refresh token changed after refresh",
    guest.token.refresh,
    refreshedGuest.token.refresh,
  );

  // Step 6: Confirm the guest id is unchanged
  TestValidator.equals(
    "guest id remains the same",
    refreshedGuest.id,
    guest.id,
  );

  // Step 7: Additional checks about guest ephemeral session permissions could be done here if API exposed such details
}
