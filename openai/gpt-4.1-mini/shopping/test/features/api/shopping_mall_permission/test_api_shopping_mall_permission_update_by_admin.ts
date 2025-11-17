import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPermission";

export async function test_api_shopping_mall_permission_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins to create admin account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinInput: IShoppingMallAdmin.IJoin = {
    email: adminEmail,
    password: "StrongPass1234",
    ip: null,
    href: "https://example.com/admin/join",
    referrer: "https://example.com/",
  };

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinInput });
  typia.assert(admin);

  // 2. Admin creates a new permission
  const permissionName = `perm_${RandomGenerator.alphaNumeric(8)}`;
  const createBody: IShoppingMallPermission.ICreate = {
    name: permissionName,
    label: "Original Permission Label",
    description: "Original permission detailed description.",
  };

  const createdPermission: IShoppingMallPermission =
    await api.functional.shoppingMall.admin.shoppingMallPermissions.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdPermission);
  TestValidator.equals(
    "created permission name matches",
    createdPermission.name,
    permissionName,
  );

  // 3. Admin updates that permission
  const updatedBody: IShoppingMallPermission.ICreate = {
    name: permissionName, // name must remain same for identification
    label: "Updated Permission Label",
    description: "Updated description with more details.",
  };

  const updatedPermission: IShoppingMallPermission =
    await api.functional.shoppingMall.admin.shoppingMallPermissions.update(
      connection,
      {
        name: permissionName,
        body: updatedBody,
      },
    );
  typia.assert(updatedPermission);

  // 4. Validate update took effect
  TestValidator.equals(
    "permission name remains same",
    updatedPermission.name,
    permissionName,
  );
  TestValidator.equals(
    "permission label is updated",
    updatedPermission.label,
    updatedBody.label,
  );
  TestValidator.equals(
    "permission description is updated",
    updatedPermission.description,
    updatedBody.description,
  );
}
