import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoListTokenBlacklist } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListTokenBlacklist";
import type { ITodoListUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListUser";

export async function test_api_user_login_missing_password(
  connection: api.IConnection,
) {
  // Test that login fails with invalid email format
  // Since password field cannot be omitted without compilation error,
  // we test that the system properly validates input by attempting login
  // with an empty password string, which simulates an invalid login attempt

  const email = typia.random<string & tags.Format<"email">>();

  // Attempt to login with empty password - should fail
  await TestValidator.error(
    "login should fail with empty password",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: email,
          password: "",
        } satisfies ITodoListUser.ILogin,
      });
    },
  );
}
