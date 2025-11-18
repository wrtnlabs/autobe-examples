import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_session_refresh(
  connection: api.IConnection,
) {
  // Step 1: Create authenticated user account and obtain initial refresh token
  const email = typia.random<string & tags.Format<"email">>();
  const joinResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email,
        password: "SecurePassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(joinResponse);

  // Store initial refresh token for use in refresh operation
  const initialRefreshToken = joinResponse.token.refresh;

  // Step 2: Verify refresh token exists and is valid
  TestValidator.predicate("refresh token exists", !!initialRefreshToken);
  TestValidator.predicate(
    "refresh token is non-empty string",
    initialRefreshToken.length > 0,
  );

  // Step 3: Refresh user session using the valid refresh token
  const refreshResponse: ITodoListUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: {
        refresh_token: initialRefreshToken,
        href: "https://example.com/refresh",
        referrer: "https://example.com/dashboard",
      } satisfies ITodoListUser.IRefresh,
    });
  typia.assert(refreshResponse);

  // Step 4: Validate that refresh operation successfully issued new access token
  TestValidator.notEquals(
    "new access token differs from previous",
    refreshResponse.token.access,
    joinResponse.token.access,
  );
  TestValidator.equals(
    "refresh token remains the same",
    refreshResponse.token.refresh,
    initialRefreshToken,
  );

  // Step 5: Verify user identity is preserved after refresh
  TestValidator.equals(
    "user id unchanged",
    refreshResponse.id,
    joinResponse.id,
  );
  TestValidator.equals(
    "user email unchanged",
    refreshResponse.email,
    joinResponse.email,
  );

  // Step 6: Validate refresh token metadata
  TestValidator.predicate(
    "access token has valid expiration",
    new Date(refreshResponse.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refresh token is still valid",
    new Date(refreshResponse.token.refreshable_until) > new Date(),
  );
}
