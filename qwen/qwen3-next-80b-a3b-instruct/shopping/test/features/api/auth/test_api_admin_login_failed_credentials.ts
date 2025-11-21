import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_failed_credentials(
  connection: api.IConnection,
) {
  // Create a new admin account with valid credentials for testing
  const admin: IShoppingMallAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "CorrectPassword123!",
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "super_admin",
  };
  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: admin,
    });
  typia.assert(createdAdmin);

  // Now attempt to login with incorrect password
  const invalidLogin: IShoppingMallAdmin.IRequest = {
    email: createdAdmin.email,
    password_hash: "WrongPassword123!", // Incorrect password
  };

  await TestValidator.error(
    "login should fail with incorrect password",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: invalidLogin,
      });
    },
  );
}
