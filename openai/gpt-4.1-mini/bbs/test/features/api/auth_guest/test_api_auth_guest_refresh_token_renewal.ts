import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPolDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPolDiscussionBoardGuest";

export async function test_api_auth_guest_refresh_token_renewal(
  connection: api.IConnection,
) {
  // Step 1: Guest joins and obtains initial tokens
  const joinBody = {
    username: RandomGenerator.name(3),
    href: "https://example.com/current",
    referrer: "https://example.com/referrer",
    ip: null,
    user_agent: null,
  } satisfies IEconPolDiscussionBoardGuest.ICreate;

  const originalGuest: IEconPolDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, { body: joinBody });
  typia.assert(originalGuest);

  // Step 2: Use refresh token to get new tokens
  const refreshBody = {
    refreshToken: originalGuest.token.refresh,
  } satisfies IEconPolDiscussionBoardGuest.IRequestRefresh;

  const refreshedGuest: IEconPolDiscussionBoardGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, { body: refreshBody });
  typia.assert(refreshedGuest);

  // Step 3: Verify the same user ID represents continuation of session
  TestValidator.equals(
    "guest user ID unchanged after refresh",
    refreshedGuest.id,
    originalGuest.id,
  );

  // Step 4: Verify tokens have changed, confirming new token issuance
  TestValidator.notEquals(
    "access token should be different after refresh",
    refreshedGuest.token.access,
    originalGuest.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be different after refresh",
    refreshedGuest.token.refresh,
    originalGuest.token.refresh,
  );

  // Step 5: Verify expiresAt and token.expired_at are defined and valid
  TestValidator.predicate(
    "new token expiresAt is defined",
    typeof refreshedGuest.expiresAt === "string" &&
      refreshedGuest.expiresAt.length > 0,
  );
  TestValidator.predicate(
    "new token expired_at is defined",
    typeof refreshedGuest.token.expired_at === "string" &&
      refreshedGuest.token.expired_at.length > 0,
  );
}
