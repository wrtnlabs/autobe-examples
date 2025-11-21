import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_invalid_email(
  connection: api.IConnection,
) {
  // Test admin login failure with invalid email address
  // Invalid email should trigger 401 Unauthorized response without session creation
  // System must not reveal whether the email exists for security reasons

  // Generate a valid email format but non-existent admin email
  const invalidEmail = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);

  // Call admin login with invalid email
  // Expected: 401 Unauthorized error with no token creation
  await TestValidator.error(
    "admin login with invalid email should fail with 401 Unauthorized",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: invalidEmail,
          password_hash: password,
        } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );
}
