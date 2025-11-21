import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_registration_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create first admin account with known email
  const firstAdminEmail: string = typia.random<string & tags.Format<"email">>();
  const firstAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: firstAdminEmail,
        password: RandomGenerator.alphaNumeric(12),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(firstAdmin);

  // Step 2: Test duplicate email registration should fail
  await TestValidator.error(
    "duplicate email registration should fail",
    async () => {
      await api.functional.auth.admin.join(connection, {
        body: {
          email: firstAdminEmail, // Same email as first admin
          password: RandomGenerator.alphaNumeric(12),
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          role: "full_admin",
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );
}
