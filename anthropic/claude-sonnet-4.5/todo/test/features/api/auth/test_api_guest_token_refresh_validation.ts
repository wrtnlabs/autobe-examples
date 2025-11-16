import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";

/**
 * Test guest token refresh endpoint validation.
 *
 * Validates that the guest token refresh endpoint properly validates refresh
 * tokens and rejects invalid or malformed tokens. This test ensures the
 * security of the token refresh mechanism by verifying that only valid refresh
 * tokens associated with active guest sessions can successfully obtain new
 * access tokens.
 *
 * Test flow:
 *
 * 1. Register a guest account to obtain a valid refresh token
 * 2. Test successful token refresh with the valid token (baseline)
 * 3. Test rejection of malformed token strings
 * 4. Test rejection of empty token strings
 * 5. Test rejection of random invalid token strings
 * 6. Verify that all invalid token scenarios return proper error responses
 */
export async function test_api_guest_token_refresh_validation(
  connection: api.IConnection,
) {
  // Step 1: Register a guest account to obtain a valid refresh token
  const registrationData = {
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoListGuest.ICreate;

  const guestAccount: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.join(connection, {
      body: registrationData,
    });
  typia.assert(guestAccount);

  // Step 2: Test successful token refresh with valid token (baseline success)
  const refreshedTokens: ITodoListGuest.IAuthorized =
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: guestAccount.token.refresh,
      } satisfies ITodoListGuest.IRefresh,
    });
  typia.assert(refreshedTokens);

  // Validate that we got new tokens back
  TestValidator.predicate(
    "refreshed response should contain valid token structure",
    refreshedTokens.token.access.length > 0 &&
      refreshedTokens.token.refresh.length > 0,
  );

  // Step 3: Test rejection of malformed token string
  await TestValidator.error("malformed token should be rejected", async () => {
    await api.functional.auth.guest.refresh(connection, {
      body: {
        refresh_token: "not-a-valid-jwt-token",
      } satisfies ITodoListGuest.IRefresh,
    });
  });

  // Step 4: Test rejection of empty token string
  await TestValidator.error(
    "empty token string should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Step 5: Test rejection of random invalid token string
  await TestValidator.error(
    "random invalid token should be rejected",
    async () => {
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(64),
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );

  // Step 6: Test rejection of well-formed but invalid JWT-like string
  await TestValidator.error(
    "well-formed but invalid JWT should be rejected",
    async () => {
      const fakeJwt = `${RandomGenerator.alphaNumeric(20)}.${RandomGenerator.alphaNumeric(30)}.${RandomGenerator.alphaNumeric(20)}`;
      await api.functional.auth.guest.refresh(connection, {
        body: {
          refresh_token: fakeJwt,
        } satisfies ITodoListGuest.IRefresh,
      });
    },
  );
}
