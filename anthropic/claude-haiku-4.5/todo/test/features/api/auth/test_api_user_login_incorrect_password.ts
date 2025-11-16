import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_incorrect_password(
  connection: api.IConnection,
) {
  // Step 1: Register a user with known credentials
  const userEmail = typia.random<string & tags.Format<"email">>();
  const correctPassword = RandomGenerator.alphaNumeric(12);

  const registeredUser = await api.functional.auth.user.join(connection, {
    body: {
      email: userEmail,
      password: correctPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ICreate,
  });
  typia.assert(registeredUser);
  TestValidator.equals(
    "registered user email matches",
    registeredUser.email,
    userEmail,
  );

  // Step 2: Attempt login with correct email but incorrect password
  const incorrectPassword = RandomGenerator.alphaNumeric(12);

  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: userEmail,
          password: incorrectPassword,
          href: typia.random<string & tags.Format<"uri">>(),
          referrer: typia.random<string & tags.Format<"uri">>(),
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );

  // Step 3: Verify successful login with correct password still works
  const successfulLogin = await api.functional.auth.user.login(connection, {
    body: {
      email: userEmail,
      password: correctPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ITodoAppUser.ILogin,
  });
  typia.assert(successfulLogin);
  TestValidator.equals(
    "successful login returns correct user",
    successfulLogin.email,
    userEmail,
  );
}
