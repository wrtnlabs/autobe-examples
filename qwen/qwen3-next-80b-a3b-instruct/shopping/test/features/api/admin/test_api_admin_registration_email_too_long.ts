import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_email_too_long(
  connection: api.IConnection,
) {
  const invalidEmail = "not-an-email"; // Invalid email format

  await TestValidator.error(
    "admin registration should fail with invalid email format",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: invalidEmail,
          password: "ValidPassword123!",
          first_name: "John",
          last_name: "Doe",
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );
}
