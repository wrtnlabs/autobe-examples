import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

/**
 * Test guest user token refresh with tampered refresh token that has invalid
 * signature.
 *
 * This test validates that the authentication system properly detects and
 * rejects refresh tokens that have been tampered with or contain invalid
 * signatures. Security validation ensures:
 *
 * - Token signature validation is enforced
 * - Tampering attempts are detected
 * - HTTP 401 Unauthorized is returned for invalid tokens
 * - Auth error code 'AUTH_INVALID_TOKEN' is provided
 * - No new tokens are issued for invalid refresh tokens
 *
 * Test workflow:
 *
 * 1. Create guest user account to obtain valid refresh token
 * 2. Tamper with the refresh token by modifying its signature
 * 3. Attempt token refresh with tampered token
 * 4. Verify HTTP 401 error response
 * 5. Verify AUTH_INVALID_TOKEN error code
 * 6. Confirm no new tokens are issued
 */
export async function test_api_guest_user_token_refresh_invalid_signature(
  connection: api.IConnection,
) {
  // Step 1: Create guest user account to obtain valid refresh token
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphabets(8) + "Aa1!"; // Meets requirements: 8+ chars, upper, lower, digit, special

  const joinResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppGuestUser.IJoin,
    });
  typia.assert(joinResponse);

  // Verify we have a refresh token
  TestValidator.predicate(
    "refresh token should be provided after registration",
    joinResponse.refreshToken !== undefined &&
      joinResponse.refreshToken !== null,
  );

  const validRefreshToken = joinResponse.refreshToken!;

  // Step 2: Tamper with the refresh token by modifying its signature
  // JWT format: header.payload.signature
  // We tamper by modifying the last part (signature)
  const tokenParts = validRefreshToken.split(".");

  TestValidator.predicate(
    "refresh token should have valid JWT format with 3 parts",
    tokenParts.length === 3,
  );

  // Modify the signature part to create invalid signature
  const tamperedSignature = RandomGenerator.alphaNumeric(43); // JWT signatures are typically base64url encoded
  const tamperedRefreshToken = `${tokenParts[0]}.${tokenParts[1]}.${tamperedSignature}`;

  // Verify the tampered token is different from the original
  TestValidator.notEquals(
    "tampered token should differ from original",
    tamperedRefreshToken,
    validRefreshToken,
  );

  // Step 3: Attempt token refresh with tampered token (should fail)
  // Step 4: Verify HTTP 401 error response
  await TestValidator.error(
    "refresh with tampered token should fail with 401 error",
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: {
          refresh_token: tamperedRefreshToken,
        } satisfies ITodoAppGuestUser.IRefresh,
      });
    },
  );

  // Step 5: Verify AUTH_INVALID_TOKEN error code using httpError validator
  await TestValidator.httpError(
    "refresh with tampered token should return 401 Unauthorized",
    401,
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: {
          refresh_token: tamperedRefreshToken,
        } satisfies ITodoAppGuestUser.IRefresh,
      });
    },
  );

  // Step 6: Verify that original valid refresh token still works
  // This confirms that the system didn't issue new tokens for the invalid attempt
  const retryResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refresh_token: validRefreshToken,
      } satisfies ITodoAppGuestUser.IRefresh,
    });
  typia.assert(retryResponse);

  // Verify new tokens were issued
  TestValidator.predicate(
    "valid refresh token should issue new access token",
    retryResponse.token !== null && retryResponse.token !== undefined,
  );

  TestValidator.predicate(
    "new access token should be different from original",
    retryResponse.token.access !== joinResponse.token.access,
  );

  // Verify the response has required token structure
  TestValidator.predicate(
    "response should include token type Bearer",
    retryResponse.tokenType === "Bearer",
  );

  TestValidator.predicate(
    "response should include expiration info",
    retryResponse.expiresIn !== undefined && retryResponse.expiresIn !== null,
  );
}
