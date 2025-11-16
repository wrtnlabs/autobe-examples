import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

/**
 * Test token refresh behavior after a user session has been explicitly
 * terminated.
 *
 * This test validates that the token refresh mechanism properly rejects refresh
 * attempts from terminated or revoked sessions, ensuring security after
 * explicit logout or session invalidation.
 *
 * Test workflow:
 *
 * 1. Create a new user account and obtain initial authentication tokens
 * 2. Store the refresh token from the initial session
 * 3. Simulate session termination by creating an unauthenticated connection
 * 4. Attempt to use the stored refresh token to obtain new access tokens
 * 5. Validate that the refresh attempt is rejected with an error
 */
export async function test_api_user_token_refresh_after_session_termination(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account and obtain initial tokens
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userPassword = "testPassword123";
  const userHref = typia.random<string & tags.Format<"uri">>();
  const userReferrer = typia.random<string & tags.Format<"uri">>();

  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
        href: userHref,
        referrer: userReferrer,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Step 2: Store the refresh token from the initial session
  const storedRefreshToken: string = registeredUser.token.refresh;

  // Step 3: Simulate session termination by creating an unauthenticated connection
  const unauthenticatedConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Attempt to use the stored refresh token to obtain new access tokens
  // Step 5: Validate that the refresh attempt is rejected with an error
  await TestValidator.error(
    "refresh token should be rejected after session termination",
    async () => {
      await api.functional.auth.user.refresh(unauthenticatedConnection, {
        body: {
          refresh_token: storedRefreshToken,
        } satisfies ITodoListUser.IRefresh,
      });
    },
  );
}
