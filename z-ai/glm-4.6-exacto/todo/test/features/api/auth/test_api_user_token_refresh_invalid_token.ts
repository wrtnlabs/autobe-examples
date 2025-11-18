import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Tests token refresh attempt with an invalid or tampered refresh token.
 *
 * Ensures the API correctly rejects requests with invalid, malformed, or
 * expired tokens, returning proper error responses and not issuing new tokens
 * or session data.
 *
 * 1. Try to refresh token with a random string as refresh token (not a JWT)
 * 2. Try to refresh token with a string that superficially resembles a JWT but is
 *    not valid/issued
 * 3. Try to refresh token with an empty string (totally malformed)
 * 4. For each case, verify that the API returns an error, does not issue session
 *    data, and does not leak info
 */
export async function test_api_user_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // 1. Completely random string (not JWT)
  await TestValidator.error(
    "refresh fails with completely random string",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(40),
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // 2. Well-formed but fake JWT-like string
  await TestValidator.error(
    "refresh fails with plausible but non-issued JWT-like string",
    async () => {
      // Structure: header.payload.signature, all base64-ish
      const fakeJwt = [
        RandomGenerator.alphaNumeric(24),
        RandomGenerator.alphaNumeric(36),
        RandomGenerator.alphaNumeric(44),
      ].join(".");
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: fakeJwt,
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // 3. Empty string
  await TestValidator.error(
    "refresh fails with an empty string token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );
}
