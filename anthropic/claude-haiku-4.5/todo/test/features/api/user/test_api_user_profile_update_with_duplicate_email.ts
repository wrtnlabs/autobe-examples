import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuth";
import type { ITodoAppAuthenticatedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthenticatedUser";

export async function test_api_user_profile_update_with_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create first user account
  const firstUserEmail = typia.random<string & tags.Format<"email">>();
  const firstUserPassword = "SecurePass123!";

  const firstUserResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: firstUserEmail,
        password: firstUserPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(firstUserResponse);

  const firstUserId = firstUserResponse.id;

  // Step 2: Create second user account with different email
  const secondUserEmail = typia.random<string & tags.Format<"email">>();
  const secondUserPassword = "AnotherPass456!";

  const secondUserResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.join(connection, {
      body: {
        email: secondUserEmail,
        password: secondUserPassword,
      } satisfies ITodoAppAuthenticatedUser.ICreate,
    });
  typia.assert(secondUserResponse);

  // Step 3: Authenticate as first user to get fresh token
  const firstUserLoginResponse: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.login(connection, {
      body: {
        email: firstUserEmail,
        password: firstUserPassword,
      } satisfies ITodoAppAuthenticatedUser.ILogin,
    });
  typia.assert(firstUserLoginResponse);

  // Step 4: Attempt to update first user's email to second user's email (should fail)
  await TestValidator.error(
    "profile update should fail with duplicate email",
    async () => {
      await api.functional.todoApp.authenticatedUser.auth.profile.update(
        connection,
        {
          body: {
            email: secondUserEmail,
          } satisfies ITodoAppAuthenticatedUser.IUpdate,
        },
      );
    },
  );

  // Step 5: Verify original email still works for login (profile unchanged)
  const firstUserVerifyLogin: ITodoAppAuthenticatedUser.IAuthorized =
    await api.functional.auth.authenticatedUser.login(connection, {
      body: {
        email: firstUserEmail,
        password: firstUserPassword,
      } satisfies ITodoAppAuthenticatedUser.ILogin,
    });
  typia.assert(firstUserVerifyLogin);
  TestValidator.equals(
    "first user ID should remain the same after failed email update",
    firstUserVerifyLogin.id,
    firstUserId,
  );
}
