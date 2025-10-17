import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_login_wrong_password(
  connection: api.IConnection,
) {
  // Create a user with a known password
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userPassword: string = "correctPassword123";

  // Register the user
  const registeredUser: ITodoListUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ICreate,
    });
  typia.assert(registeredUser);

  // Attempt to login with incorrect password
  await TestValidator.error(
    "login with wrong password should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: "wrongPassword123",
        } satisfies ITodoListUser.ILogin,
      });
    },
  );

  // Verify that the user is not authenticated
  try {
    // Attempt to access a protected resource
    await api.functional.auth.user.login(connection, {
      body: {
        email: userEmail,
        password: userPassword,
      } satisfies ITodoListUser.ILogin,
    });
    TestValidator.predicate(
      "user should be authenticated with correct password",
      true,
    );
  } catch (error) {
    TestValidator.predicate(
      "user should not be authenticated with wrong password",
      false,
    );
  }
}
