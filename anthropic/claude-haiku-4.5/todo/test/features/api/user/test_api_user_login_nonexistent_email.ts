import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_nonexistent_email(
  connection: api.IConnection,
) {
  // Attempt login with a non-existent email address
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  const password = "test_password_123";

  // Create login request with valid format but unregistered email
  const loginRequest = {
    email: nonexistentEmail,
    password: password,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ITodoAppUser.ILogin;

  // Test that login fails with non-existent email
  await TestValidator.error(
    "login should fail with non-existent email",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: loginRequest,
      });
    },
  );
}
