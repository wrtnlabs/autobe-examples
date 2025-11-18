import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_create_minimal_fields(
  connection: api.IConnection,
) {
  // 1. Register an administrator and obtain an authenticated admin context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create a new admin permission with only minimal required fields
  const permissionCodePrefix = "e2e.permission." as const;
  const permissionCode = `${permissionCodePrefix}${RandomGenerator.alphabets(16)}`;
  const permissionName = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 10,
  });

  const createBody = {
    code: permissionCode,
    name: permissionName,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(createdPermission);

  // 3. Validate fields on created permission
  TestValidator.equals(
    "created permission code must equal requested code",
    createdPermission.code,
    permissionCode,
  );
  TestValidator.equals(
    "created permission name must equal requested name",
    createdPermission.name,
    permissionName,
  );

  // `is_system` should default to false for newly created, non-system permission
  TestValidator.equals(
    "created permission should not be system by default",
    createdPermission.is_system,
    false,
  );

  // Ensure basic lifecycle fields are present via typia; no additional checks needed
  typia.assert<string & tags.Format<"uuid">>(createdPermission.id);
  typia.assert<string & tags.Format<"date-time">>(createdPermission.created_at);
  typia.assert<string & tags.Format<"date-time">>(createdPermission.updated_at);

  // 4. Retrieve the permission by its code to confirm persistence
  const reloadedPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert<IShoppingMallAdminPermission>(reloadedPermission);

  // 5. Assert that reloaded permission matches the created one on key business fields
  TestValidator.equals(
    "reloaded permission id must equal created permission id",
    reloadedPermission.id,
    createdPermission.id,
  );
  TestValidator.equals(
    "reloaded permission code must equal created permission code",
    reloadedPermission.code,
    createdPermission.code,
  );
  TestValidator.equals(
    "reloaded permission name must equal created permission name",
    reloadedPermission.name,
    createdPermission.name,
  );
  TestValidator.equals(
    "reloaded permission is_system must equal created permission is_system",
    reloadedPermission.is_system,
    createdPermission.is_system,
  );

  // A freshly created permission should not be soft-deleted
  TestValidator.predicate(
    "created permission deleted_at should be null or undefined",
    reloadedPermission.deleted_at === null ||
      reloadedPermission.deleted_at === undefined,
  );
}
