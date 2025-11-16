import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_invalid_password(
  connection: api.IConnection,
) {
  // Step 1: Create a valid user account to ensure email exists in system
  const validEmail = typia.random<string & tags.Format<"email">>();
  const validPassword = "ValidPassword123";

  const user = await api.functional.auth.user.join(connection, {
    body: {
      email: validEmail,
      password: validPassword,
      href: "http://localhost:3000/",
      referrer: "http://localhost:3000/",
    } satisfies ITodoAppUser.IJoin,
  });
  typia.assert(user);

  // Clear authorization header to simulate unauthenticated state
  connection.headers = {};

  // Step 2: Attempt login with correct email but wrong password
  await TestValidator.error(
    "login with incorrect password should fail",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: validEmail,
          password: "WrongPassword456", // Incorrect password
          href: "http://localhost:3000/",
          referrer: "http://localhost:3000/",
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );

  // Verify connection headers remain empty after failed login
  TestValidator.equals(
    "connection headers should remain empty after failed login",
    connection.headers?.Authorization,
    undefined,
  );
}
