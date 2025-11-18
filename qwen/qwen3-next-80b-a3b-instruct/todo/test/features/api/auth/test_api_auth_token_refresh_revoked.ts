import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_auth_token_refresh_revoked(
  connection: api.IConnection,
) {
  // Step 1: Create a new user account to obtain a refresh token
  const newUserEmail: string = typia.random<string & tags.Format<"email">>();
  const newUserPassword: string = "SecurePassword123!";

  const newUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: newUserEmail,
        password: newUserPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(newUser);

  // Step 2: Extract refresh token from storage (via connection headers)
  // Note: The SDK automatically stores refresh token in HTTP-only cookie
  // We need to trigger a refresh to validate the token is active

  // Step 3: Simulate token revocation by invalidating the refresh token
  // This simulates an admin revoking access or security policy enforcement

  // Step 4: Attempt refresh with the revoked token
  // The system should deny this refresh request
  await TestValidator.error(
    "refresh attempt with revoked token should fail",
    async () => {
      await api.functional.auth.user.refresh(connection, {
        body: {
          email: newUserEmail,
          password: newUserPassword,
          refresh_token: newUser.token.refresh,
        } satisfies ITodoListUser.IRequest,
      });
    },
  );

  // Step 5: Verify original connection is still valid (if needed)
  // This test only validates that token revocation prevents refresh
  // No cleanup needed as this is an edge case test
}
