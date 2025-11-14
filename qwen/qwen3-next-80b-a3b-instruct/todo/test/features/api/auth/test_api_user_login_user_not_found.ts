import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_user_not_found(
  connection: api.IConnection,
) {
  // Generate a random email that doesn't exist in the system
  const nonExistentEmail = typia.random<string & tags.Format<"email">>();

  // Create a password that meets the minimum requirements (8-72 characters)
  const password = RandomGenerator.alphaNumeric(12);

  // Attempt to login with non-existent user credentials
  // Validate that the system returns an error without revealing if the email exists
  await TestValidator.error(
    "Login should fail for non-existent user",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: nonExistentEmail,
          password: password,
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
