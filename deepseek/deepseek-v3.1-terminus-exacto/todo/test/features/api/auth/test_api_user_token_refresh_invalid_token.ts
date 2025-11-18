import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

/**
 * Test token refresh failure scenario with invalid or tampered refresh tokens.
 *
 * This test validates security measures against token manipulation and
 * unauthorized access attempts. It establishes proper authentication context,
 * then attempts refresh with intentionally corrupted tokens to verify robust
 * validation and error handling. Validates that the system detects token
 * integrity violations and prevents security breaches.
 */
export async function test_api_user_token_refresh_invalid_token(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account for authentication testing
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "TestPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      name: RandomGenerator.name(),
      href: "https://example.com/app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(user);

  // Step 2: Login to obtain valid tokens
  const loginResult = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: userPassword,
      href: "https://example.com/app",
      referrer: "https://example.com",
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(loginResult);

  const validRefreshToken = loginResult.token.refresh;

  // Step 3: Test empty string refresh token
  await TestValidator.error("empty refresh token should fail", async () => {
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: "",
      } satisfies ITodoAppUser.IRefresh,
    });
  });

  // Step 4: Test random string as refresh token
  await TestValidator.error(
    "random string refresh token should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: RandomGenerator.alphaNumeric(32),
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 5: Test malformed JWT-like string
  await TestValidator.error(
    "malformed JWT refresh token should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token:
            "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.payload.signature",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 6: Test tampered valid refresh token with robust logic
  if (validRefreshToken && validRefreshToken.length > 5) {
    const midPoint = Math.floor(validRefreshToken.length / 2);
    const tamperedToken =
      validRefreshToken.substring(0, midPoint) +
      "TAMPERED" +
      validRefreshToken.substring(midPoint);

    await TestValidator.error(
      "tampered refresh token should fail",
      async () => {
        await api.functional.auth.user.refresh(connection, {
          body: {
            refresh_token: tamperedToken,
          } satisfies ITodoAppUser.IRefresh,
        });
      },
    );
  }

  // Step 7: Test numeric string as refresh token
  await TestValidator.error(
    "numeric string refresh token should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          refresh_token: "12345678901234567890123456789012",
        } satisfies ITodoAppUser.IRefresh,
      });
    },
  );

  // Step 8: Verify valid refresh token still works (positive control)
  const refreshResult = await api.functional.auth.user.refresh(connection, {
    body: {
      refresh_token: validRefreshToken,
    } satisfies ITodoAppUser.IRefresh,
  });
  typia.assert(refreshResult);

  TestValidator.equals(
    "valid refresh should return new tokens with same user ID",
    refreshResult.id,
    user.id,
  );
}
