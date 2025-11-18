import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";
import type { ITodoListUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUserEmailVerification";

/**
 * Test that submitting an invalid, expired, or tampered refresh token to the
 * refresh endpoint is rejected and does not issue new tokens. Validates system
 * security against refresh token misuse, including registration, email
 * verification, login, and then attempts to refresh with invalid, expired, or
 * manipulated token values.
 */
export async function test_api_auth_token_refresh_invalid_or_expired_token(
  connection: api.IConnection,
) {
  // Register a new user
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string & tags.Format<"password"> = typia.random<
    string & tags.Format<"password">
  >();
  const displayName = RandomGenerator.name();
  const joinHref = "https://todolist-app.test/join";
  const joinReferrer = "https://todolist-app.test/landing";
  await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      display_name: displayName,
      href: joinHref,
      referrer: joinReferrer,
    } satisfies ITodoListUser.IJoin,
  });

  // Simulate email verification
  // Normally, you would retrieve the verification token from email, but here we simulate by using random
  const verificationToken: string & tags.MinLength<1> = typia.random<
    string & tags.MinLength<1>
  >();
  await api.functional.auth.user.verify_email.verifyEmail(connection, {
    body: {
      verification_token: verificationToken,
    } satisfies ITodoListUserEmailVerification.IVerify,
  });

  // Login as the user to retrieve valid tokens
  const loginResult: ITodoListUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email,
        password,
        href: "https://todolist-app.test/login",
        referrer: "https://todolist-app.test/login-form",
      } satisfies ITodoListUser.ILogin,
    });
  typia.assert(loginResult);

  // Extract a valid refresh token
  const validRefreshToken: string = loginResult.token.refresh;

  // 1. Attempt with a clearly invalid/malformed token (e.g., random string)
  await TestValidator.error(
    "refresh rejects completely random token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(32),
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // 2. Attempt with valid-looking, but mutated token
  const mutatedToken =
    validRefreshToken.substring(0, validRefreshToken.length - 4) +
    RandomGenerator.alphaNumeric(4);
  await TestValidator.error(
    "refresh rejects tampered refresh token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: { refresh_token: mutatedToken } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // 3. Attempt with an expired/revoked (already used) refresh token.
  // First, refresh with the valid token (should succeed)
  const refreshed: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: validRefreshToken,
      } satisfies ITodoListUser.IRefresh,
    });
  typia.assert(refreshed);
  // The same token may be revoked after use (single-use semantics)
  await TestValidator.error(
    "refresh rejects reused/expired refresh token",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: validRefreshToken,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );

  // 4. Also test with an empty token
  await TestValidator.error("refresh rejects empty refresh token", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: { refresh_token: "" } satisfies ITodoListUser.IRefresh,
    });
  });
}
