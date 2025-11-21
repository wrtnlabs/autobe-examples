import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";

export async function test_api_admin_login_failure_suspended(
  connection: api.IConnection,
) {
  // Create a new admin account with 'pending_verification' status
  const password = RandomGenerator.name();
  const newAdmin: IShoppingMallAdmin.ICreate = {
    email: typia.random<string & tags.Format<"email">>(),
    password: password,
    first_name: RandomGenerator.name(),
    last_name: RandomGenerator.name(),
    role: "full_admin",
  };

  // Join to create the admin account
  const createdAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: newAdmin satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(createdAdmin);

  // Prepare login request with the same password and email
  const loginBody: IShoppingMallAdmin.IRequest = {
    email: createdAdmin.email,
    password_hash: password,
  };

  // This should fail with an error since status is 'pending_verification' (non-active)
  await TestValidator.error(
    "login should fail for pending_verification admin",
    async () => {
      await api.functional.auth.admin.login(connection, {
        body: loginBody satisfies IShoppingMallAdmin.IRequest,
      });
    },
  );
}
