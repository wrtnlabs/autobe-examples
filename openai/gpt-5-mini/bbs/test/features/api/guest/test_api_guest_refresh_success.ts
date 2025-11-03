import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";

export async function test_api_guest_refresh_success(
  connection: api.IConnection,
) {
  // 1) Create a temporary guest via POST /auth/guest/join
  const joinBody = {
    displayName: RandomGenerator.name(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardGuest.ICreate;

  const original: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: joinBody,
    });
  // Validate response shape
  typia.assert(original);

  // Extract original tokens and guest id
  const originalToken: IAuthorizationToken = original.token;
  const guestId: string & tags.Format<"uuid"> = original.id;

  // Basic sanity checks on returned token
  TestValidator.predicate(
    "original access token not empty",
    originalToken.access.length > 0,
  );
  TestValidator.predicate(
    "original refresh token not empty",
    originalToken.refresh.length > 0,
  );

  // 2) Call POST /auth/guest/refresh with the valid refresh token
  const refreshBody = {
    refresh_token: originalToken.refresh,
  } satisfies IDiscussionBoardGuest.IRefresh;

  const refreshed: IDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // 3) Verify the response returns a renewed access token and references same guest id
  TestValidator.equals(
    "guest id preserved after refresh",
    refreshed.id,
    guestId,
  );

  // Access token should be rotated (new value)
  TestValidator.notEquals(
    "access token rotated",
    originalToken.access,
    refreshed.token.access,
  );

  // Refresh token may or may not be rotated. Ensure refreshed refresh token exists and is a string.
  TestValidator.predicate(
    "refreshed refresh token exists",
    typeof refreshed.token.refresh === "string" &&
      refreshed.token.refresh.length > 0,
  );

  // 4) Confirm the guest row exists (deleted_at is null)
  // The DTO allows deletedAt to be null|undefined; per scenario require explicit null
  TestValidator.equals(
    "guest not deleted (deletedAt is null)",
    refreshed.deletedAt,
    null,
  );

  // 5) Token lifetime checks: access expiry should be a valid date and short-lived
  const accessExpiry = Date.parse(refreshed.token.expired_at);
  const refreshExpiry = Date.parse(refreshed.token.refreshable_until);
  TestValidator.predicate(
    "access expiry is a valid timestamp",
    !Number.isNaN(accessExpiry),
  );
  TestValidator.predicate(
    "refreshable_until is a valid timestamp",
    !Number.isNaN(refreshExpiry),
  );

  // Access token lifetime should be reasonably short from now (e.g., within 6 hours)
  TestValidator.predicate(
    "access token lifetime is short (<=6 hours)",
    accessExpiry - Date.now() <= 1000 * 60 * 60 * 6,
  );

  // Refresh token lifetime should be within a reasonable sliding window (e.g., <= 7 days)
  TestValidator.predicate(
    "refresh token lifetime is limited (<=7 days)",
    refreshExpiry - Date.now() <= 1000 * 60 * 60 * 24 * 7,
  );
}
