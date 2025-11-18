import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_update_toggle_system_flag(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin account so that we have an authenticated admin session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a non-system admin role with a stable code so we can update it later.
  const roleCreateBody = {
    code: "audit_admin",
    name: "Audit Administrator",
    description:
      "Role responsible for viewing and auditing administrative actions.",
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleCreateBody,
    });
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // Basic sanity checks on the created role.
  TestValidator.equals(
    "created role code should match request code",
    createdRole.code,
    roleCreateBody.code,
  );
  TestValidator.equals(
    "created role name should match request name",
    createdRole.name,
    roleCreateBody.name,
  );
  TestValidator.equals(
    "created role description should match request description",
    createdRole.description ?? null,
    roleCreateBody.description ?? null,
  );
  TestValidator.equals(
    "created role is_system should be false",
    createdRole.is_system,
    false,
  );

  const originalUpdatedAt = createdRole.updated_at;
  const originalCreatedAt = createdRole.created_at;

  // 3. Update only the is_system flag to true using the role code as path param.
  const updateBody = {
    is_system: true,
  } satisfies IShoppingMallAdminRole.IUpdate;

  const updatedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.update(connection, {
      adminRoleCode: "audit_admin",
      body: updateBody,
    });
  typia.assert<IShoppingMallAdminRole>(updatedRole);

  // 4. Validate business expectations on the updated role.
  TestValidator.equals(
    "updated role code must remain unchanged",
    updatedRole.code,
    createdRole.code,
  );
  TestValidator.equals(
    "updated role name must remain unchanged when not provided in update",
    updatedRole.name,
    createdRole.name,
  );
  TestValidator.equals(
    "updated role description must remain unchanged when not provided in update",
    updatedRole.description ?? null,
    createdRole.description ?? null,
  );
  TestValidator.equals(
    "updated role is_system flag should be true after update",
    updatedRole.is_system,
    true,
  );
  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedRole.created_at,
    originalCreatedAt,
  );

  // Ensure updated_at has changed to reflect the update.
  TestValidator.notEquals(
    "updated_at should change when role is updated",
    updatedRole.updated_at,
    originalUpdatedAt,
  );

  // Optionally, if ISO 8601 ordering is guaranteed, assert that updated_at is later.
  await TestValidator.predicate(
    "updated_at should be later than original updated_at in lexicographical ISO-8601 order",
    async () => updatedRole.updated_at > originalUpdatedAt,
  );
}
