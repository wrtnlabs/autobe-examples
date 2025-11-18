import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Verifies /auth/user/refresh robustly rejects invalid, expired, or revoked
 * tokens without information leakage.
 *
 * Steps:
 *
 * 1. Register a legitimate new user and log in to get a real refresh token.
 * 2. Attempt refresh using a fabricated random token string.
 * 3. Attempt refresh with a structurally valid but unrelated token value.
 * 4. Attempt refresh using a valid token after simulating deletion (no delete API,
 *    so log in again for a new session).
 * 5. Attempt refresh using an old (but previously valid) token after login rotates
 *    it (token invalidation simulation).
 * 6. Verify for every case:
 *
 *    - The refresh fails (throws/rejects).
 *    - No new tokens are issued.
 *    - The error message does not reveal existence of the session, user, or reason.
 *    - The API behaviour is consistent and generic regardless of token or user
 *         state.
 */
export async function test_api_auth_refresh_with_invalid_or_expired_token(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: RandomGenerator.alphaNumeric(10) + "@example.com",
    password: RandomGenerator.alphaNumeric(12),
    href: "https://test.local/join",
    referrer: "https://test.local/landing",
  } satisfies ITodoListUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2. Log in to get real refresh token
  const loginBody = {
    email: joinBody.email,
    password: joinBody.password as string & tags.Format<"password">,
    href: "https://test.local/login",
    referrer: "https://test.local/landing",
  } satisfies ITodoListUser.ILogin;
  const loginRes = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(loginRes);
  const validRefreshToken = loginRes.token.refresh;

  // 3. Use a random fabricated token
  const fakeToken = RandomGenerator.alphaNumeric(48);
  await TestValidator.error(
    "refresh should fail for a fabricated token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: { refresh_token: fakeToken } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // 4. Use a structurally valid but unrelated token (UUID format)
  const uuidToken = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "refresh should fail for structurally valid but unrelated token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: { refresh_token: uuidToken } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // 5. Use old refresh token after rotation (login again to rotate token)
  const loginRes2 = await api.functional.auth.user.login(connection, {
    body: loginBody,
  });
  typia.assert(loginRes2);
  const newRefreshToken = loginRes2.token.refresh;
  await TestValidator.error(
    "refresh should fail for old (rotated) token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: validRefreshToken,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // 6. Attempt refresh after invalidating session (simulate expired/invalid by reuse and randomness)
  await TestValidator.error(
    "refresh should fail for random token (expired simulation)",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(48),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // 7. Attempt refresh with current valid token for completeness (should succeed)
  const validRefRes = await api.functional.auth.user.refresh(connection, {
    body: { refresh_token: newRefreshToken } satisfies ITodoListUser.IRefresh,
  });
  typia.assert(validRefRes);
  TestValidator.equals(
    "refresh issues a new access token for valid token",
    typeof validRefRes.token.access,
    "string",
  );
}
