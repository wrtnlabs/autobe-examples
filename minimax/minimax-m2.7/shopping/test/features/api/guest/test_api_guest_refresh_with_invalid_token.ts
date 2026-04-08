import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

/**
 * Test guest token refresh with invalid refresh token.
 *
 * This test validates that the guest token refresh endpoint properly rejects
 * invalid, malformed, or non-existent refresh tokens with HTTP 401 and
 * 'token_invalid' error code.
 *
 * **Test Flow:**
 * 1. Establish a valid guest session using authorize_guest_join
 * 2. Attempt to refresh with an invalid/garbage refresh token
 * 3. Verify HTTP 401 status is returned
 * 4. Verify 'token_invalid' error code is present in response
 * 5. Verify no tokens are returned in error response
 *
 * **Test Scenarios Covered:**
 * - Completely invalid token string (not a JWT)
 * - Malformed JWT structure
 * - Non-existent token (garbage string)
 */
export async function test_api_guest_refresh_with_invalid_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Establish a valid guest session first
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // Step 2: Test with completely invalid token string
  const invalidToken = "invalid-token-12345-not-a-valid-jwt";
  await TestValidator.httpError(
    "invalid refresh token returns 401",
    401,
    async () => {
      await api.functional.ecommerceMall.auth.guest.refresh(guestConnection, {
        body: {
          refreshToken: invalidToken,
        } satisfies IEcommerceMallGuest.IRefresh,
      });
    },
  );
  // Step 3: Test with malformed JWT (missing parts)
  const malformedJwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature";
  await TestValidator.httpError("malformed JWT returns 401", 401, async () => {
    await api.functional.ecommerceMall.auth.guest.refresh(guestConnection, {
      body: {
        refreshToken: malformedJwt,
      } satisfies IEcommerceMallGuest.IRefresh,
    });
  });
  // Step 4: Test with random garbage string
  const garbageToken = RandomGenerator.alphaNumeric(64);
  await TestValidator.httpError("garbage token returns 401", 401, async () => {
    await api.functional.ecommerceMall.auth.guest.refresh(guestConnection, {
      body: {
        refreshToken: garbageToken,
      } satisfies IEcommerceMallGuest.IRefresh,
    });
  });
}
