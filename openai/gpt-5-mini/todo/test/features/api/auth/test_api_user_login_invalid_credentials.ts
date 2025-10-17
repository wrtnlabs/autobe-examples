import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_invalid_credentials(
  connection: api.IConnection,
) {
  // 1) Create a unique test user account
  const password = RandomGenerator.alphaNumeric(12);
  const email = typia.random<string & tags.Format<"email">>();
  const joinBody = {
    email,
    password,
    display_name: RandomGenerator.name(),
  } satisfies ITodoAppUser.ICreate;

  const created: ITodoAppUser.IAuthorized = await api.functional.auth.user.join(
    connection,
    {
      body: joinBody,
    },
  );
  typia.assert(created);
  TestValidator.equals(
    "created user email matches request",
    created.email,
    joinBody.email,
  );

  // 2) Attempt login with invalid credentials and expect an error
  const wrongPassword = `${password}__wrong`;
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: joinBody.email,
          password: wrongPassword,
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );

  // 3) Confirm that correct credentials still work
  const successLogin: ITodoAppUser.IAuthorized =
    await api.functional.auth.user.login(connection, {
      body: {
        email: joinBody.email,
        password: joinBody.password,
      } satisfies ITodoAppUser.ILogin,
    });
  typia.assert(successLogin);

  TestValidator.equals(
    "successful login returns same user id",
    successLogin.id,
    created.id,
  );
}
