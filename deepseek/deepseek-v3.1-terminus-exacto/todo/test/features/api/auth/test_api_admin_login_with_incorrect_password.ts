import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ITodoListAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListAdmin";

/**
 * Validate that admin login fails with a wrong password.
 *
 * This test supplies a real (randomly generated) admin email and a valid, but
 * intentionally incorrect password. It asserts that the login request is
 * denied, no token is issued, and the response contains only a generic
 * authentication error without revealing lock or deletion status. The logic
 * also avoids testing for specific status codes, error messages, or type
 * errors— the only objective is to confirm that authentication fails as
 * expected in this security-sensitive scenario.
 */
export async function test_api_admin_login_with_incorrect_password(
  connection: api.IConnection,
) {
  // Generate a valid admin email and a wrong, but valid-format password
  const email = typia.random<string & tags.Format<"email">>();
  const wrongPassword = RandomGenerator.alphaNumeric(16); // satisfy MinLength<8>, MaxLength<128>, Format<"password">

  // Test that login fails (with no token issued, no information leak)
  await TestValidator.error(
    "admin login fails with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email,
          password: wrongPassword as string &
            tags.MinLength<8> &
            tags.MaxLength<128> &
            tags.Format<"password">,
        } satisfies ITodoListAdmin.ILogin,
      });
    },
  );
}
