import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_empty_email(
  connection: api.IConnection,
) {
  // Test admin login with empty email string
  // System should reject empty email with 400 Bad Request
  // Validate that empty string is properly validated before authentication attempt
  await TestValidator.error(
    "empty email should fail authentication",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: {
          email: "", // Empty string email
          password_hash: "validPassword123",
        } satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );
}
