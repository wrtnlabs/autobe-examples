import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_create_duplicate_email(
  connection: api.IConnection,
) {
  // Create first admin account with unique email
  const firstAdminEmail = typia.random<string & tags.Format<"email">>();
  const firstAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: firstAdminEmail,
        password: "SecurePass123!",
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(firstAdmin);

  // Attempt to create second admin account with same email (should fail with 409 Conflict)
  await TestValidator.error(
    "duplicate admin email should fail with 409 Conflict",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: firstAdminEmail, // Same email as first admin
          password: "AnotherPass456!",
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );
}
