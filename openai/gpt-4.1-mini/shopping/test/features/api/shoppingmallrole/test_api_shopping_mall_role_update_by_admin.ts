import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRole";

export async function test_api_shopping_mall_role_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Administrator Registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePass123!";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        ip: null,
        href: "https://example.com/admin/signup",
        referrer: "https://example.com/signin",
      } satisfies IShoppingMallAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Create a new shopping mall role
  const initialRoleName = `${RandomGenerator.alphabets(10)}`;
  const roleToCreate: IShoppingMallRole.ICreate = {
    name: initialRoleName,
    label: "Initial Role Label",
    description: "Role created for update testing purposes.",
  };
  const createdRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.shoppingMallRoles.create(
      connection,
      {
        body: roleToCreate,
      },
    );
  typia.assert(createdRole);
  TestValidator.equals(
    "role name matches on creation",
    createdRole.name,
    roleToCreate.name,
  );
  TestValidator.equals(
    "role label matches on creation",
    createdRole.label,
    roleToCreate.label,
  );
  TestValidator.equals(
    "role description matches on creation",
    createdRole.description,
    roleToCreate.description,
  );

  // 3. Update the role's label and description
  const updatedRoleBody: IShoppingMallRole.IUpdate = {
    label: "Updated Role Label",
    description: "Updated description for the role.",
  };
  const updatedRole: IShoppingMallRole =
    await api.functional.shoppingMall.admin.shoppingMallRoles.update(
      connection,
      {
        name: initialRoleName,
        body: updatedRoleBody,
      },
    );
  typia.assert(updatedRole);
  TestValidator.equals(
    "role name remains unchanged after update",
    updatedRole.name,
    initialRoleName,
  );
  TestValidator.equals(
    "role label updated correctly",
    updatedRole.label,
    updatedRoleBody.label,
  );
  TestValidator.equals(
    "role description updated correctly",
    updatedRole.description,
    updatedRoleBody.description,
  );
}
