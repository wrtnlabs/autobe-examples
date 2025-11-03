import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_user_role_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registers and authenticates
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "Admin#1234",
        full_name: "Admin User",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a user role for update
  // Note: For user_id, we use a random UUID to simulate an existing user
  const userId = typia.random<string & tags.Format<"uuid">>();
  const createRequestBody = {
    user_id: userId,
    role_name: "customer",
  } satisfies IShoppingMallUserRole.ICreate;

  const createdUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: createRequestBody,
    });
  typia.assert(createdUserRole);
  TestValidator.equals(
    "created user role user_id matches",
    createdUserRole.user_id,
    createRequestBody.user_id,
  );
  TestValidator.equals(
    "created user role role_name matches",
    createdUserRole.role_name,
    createRequestBody.role_name,
  );

  // 3. Update the user role's role_name
  const updateRequestBody = {
    role_name: "seller",
    // updated_at is optional and can be omitted or explicitly null
  } satisfies IShoppingMallUserRole.IUpdate;

  const updatedUserRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.update(connection, {
      id: typia.assert<string & tags.Format<"uuid">>(createdUserRole.id),
      body: updateRequestBody,
    });
  typia.assert(updatedUserRole);

  TestValidator.equals(
    "updated user role id remains the same",
    updatedUserRole.id,
    createdUserRole.id,
  );
  TestValidator.equals(
    "updated user role user_id remains the same",
    updatedUserRole.user_id,
    createdUserRole.user_id,
  );
  TestValidator.equals(
    "updated user role role_name has changed",
    updatedUserRole.role_name,
    updateRequestBody.role_name,
  );
}
