import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";
import type { ITodoAppGuestUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuestUser";

export async function test_api_guest_user_token_refresh_expired_token(
  connection: api.IConnection,
) {
  // 1. Create guest user account to obtain refresh token
  const email = typia.random<string & tags.Format<"email">>();

  // Generate password meeting strength requirements: 8+ chars, uppercase, lowercase, digit, special char
  const password =
    "Test" +
    RandomGenerator.alphabets(3) +
    RandomGenerator.pick(["123", "456", "789"]) +
    RandomGenerator.pick(["!", "@", "#"]);

  const joinResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.join(connection, {
      body: {
        email,
        password,
      } satisfies ITodoAppGuestUser.IJoin,
    });
  typia.assert(joinResponse);

  // Verify initial response contains valid tokens
  TestValidator.predicate(
    "join response should contain access token",
    joinResponse.token?.access !== undefined &&
      joinResponse.token.access.length > 0,
  );
  TestValidator.predicate(
    "join response should contain refresh token",
    joinResponse.refreshToken !== undefined &&
      joinResponse.refreshToken.length > 0,
  );

  // 2. Simulate expired refresh token - use structurally invalid token
  const expiredRefreshToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5ZDg0NzlmNy1iODI0LTQzMzgtOTg4NS1mZjk4YjdlMjNhNzgiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE2MDAwMDAwMDAsImV4cCI6MTYwMDAwMDEwMH0.invalid";

  // 3. Attempt to refresh token using expired token
  await TestValidator.error(
    "expired refresh token should return 401 Unauthorized",
    async () => {
      await api.functional.auth.guestUser.refresh(connection, {
        body: {
          refresh_token: expiredRefreshToken,
        } satisfies ITodoAppGuestUser.IRefresh,
      });
    },
  );

  // 4. Verify valid refresh token still works
  typia.assertGuard<string>(joinResponse.refreshToken);

  const validRefreshResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.guestUser.refresh(connection, {
      body: {
        refresh_token: joinResponse.refreshToken,
      } satisfies ITodoAppGuestUser.IRefresh,
    });
  typia.assert(validRefreshResponse);

  TestValidator.predicate(
    "valid refresh token should return new access token",
    validRefreshResponse.token?.access !== undefined &&
      validRefreshResponse.token.access.length > 0,
  );

  TestValidator.notEquals(
    "new access token should differ from original",
    validRefreshResponse.token.access,
    joinResponse.token.access,
  );
}
