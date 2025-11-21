import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_account_creation_duplicate_email(
  connection: api.IConnection,
) {
  // Step 1: Create the first admin account with a specific email
  const email = typia.random<string & tags.Format<"email">>();
  const firstAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: RandomGenerator.alphaNumeric(16),
        first_name: RandomGenerator.name(),
        last_name: RandomGenerator.name(),
        role: "super_admin" as const,
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(firstAdmin);

  // Step 2: Verify the admin account was created successfully
  TestValidator.equals("first admin email matches", firstAdmin.email, email);

  // Step 3: Attempt to create another admin account with the same email
  // This should fail due to the unique email constraint
  await TestValidator.error(
    "duplicate email should fail account creation",
    async () => {
      await api.functional.shoppingMall.admin.actors.admins.create(connection, {
        body: {
          email, // Same email as first admin
          password: RandomGenerator.alphaNumeric(16),
          first_name: RandomGenerator.name(),
          last_name: RandomGenerator.name(),
          role: "full_admin" as const,
        } satisfies IShoppingMallAdmin.ICreate,
      });
    },
  );
}
