import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_invalid_password(
  connection: api.IConnection,
) {
  // Generate valid email for existing user
  const validEmail: string = typia.random<string & tags.Format<"email">>();

  // Generate invalid password that differs from the correct one
  const invalidPassword: string = RandomGenerator.alphaNumeric(12);

  // Test login with valid email but invalid password
  // This should trigger a server-side authentication failure
  await TestValidator.error(
    "login should fail with invalid password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: validEmail,
          password: invalidPassword,
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
