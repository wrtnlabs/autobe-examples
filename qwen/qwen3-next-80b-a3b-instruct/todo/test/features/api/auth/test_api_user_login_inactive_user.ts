import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ITodoAppAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAuthorizationToken";
import type { ITodoAppUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppUser";

export async function test_api_user_login_inactive_user(
  connection: api.IConnection,
) {
  // Known inactive test user (pre-seeded in test environment)
  // This user must exist in the test environment with is_active: false
  // Login attempts with correct credentials for inactive users should fail
  const inactiveEmail = "inactive-test-user@example.com";
  const inactivePassword = "testpass123";

  // Verify that login with valid credentials fails for inactive account
  await TestValidator.error(
    "inactive user should be denied login even with correct credentials",
    async () => {
      await api.functional.auth.user.login(connection, {
        body: {
          email: inactiveEmail,
          password: inactivePassword,
        } satisfies ITodoAppUser.ILogin,
      });
    },
  );
}
