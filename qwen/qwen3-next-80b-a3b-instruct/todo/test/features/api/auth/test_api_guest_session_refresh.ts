import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

export async function test_api_guest_session_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create a guest account to obtain a valid refresh token
  const guestEmail: string = typia.random<string & tags.Format<"email">>();
  const guestJoinResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: {
        email: guestEmail,
        href: "https://example.com",
        referrer: "https://example.com/home",
        ip: "192.168.1.1",
      } satisfies ITodoListGuest.IJoin,
    });
  typia.assert(guestJoinResponse);

  // Verify we got a valid refresh token
  const refreshToken: ITodoListGuest.IRefresh = guestJoinResponse.token.refresh;
  TestValidator.equals(
    "refresh token is present",
    refreshToken,
    guestJoinResponse.token.refresh,
  );

  // Step 2: Use the refresh token to refresh the guest session
  const refreshResponse: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: refreshToken,
    });
  typia.assert(refreshResponse);

  // Validate that a new access token was issued
  TestValidator.notEquals(
    "new access token after refresh should differ from original",
    refreshResponse.token.access,
    guestJoinResponse.token.access,
  );

  // Validate that the refresh token was renewed
  TestValidator.notEquals(
    "new refresh token after refresh should differ from original",
    refreshResponse.token.refresh,
    refreshToken,
  );

  // Validate email remains the same after refresh
  TestValidator.equals(
    "email should remain unchanged after session refresh",
    refreshResponse.email,
    guestEmail,
  );

  // Validate refreshable_until is in the future
  const refreshableUntil = new Date(refreshResponse.token.refreshable_until);
  const now = new Date();
  TestValidator.predicate(
    "refreshable_until should be in the future",
    refreshableUntil > now,
  );

  // Validate expired_at is in the future
  const expiredAt = new Date(refreshResponse.token.expired_at);
  TestValidator.predicate(
    "expired_at should be in the future",
    expiredAt > now,
  );
}
