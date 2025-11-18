import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_creation_basic_happy_path(
  connection: api.IConnection,
) {
  // 1. Create and authenticate an admin via POST /auth/admin/join
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Prepare a unique, valid admin role payload
  const roleCodeSuffix = RandomGenerator.alphaNumeric(8);
  const createRoleBody = {
    code: `operations_admin_${roleCodeSuffix}`,
    name: "Operations Administrator",
    description: RandomGenerator.paragraph({
      sentences: 6,
      wordMin: 3,
      wordMax: 10,
    }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  // 3. Call POST /shoppingMall/admin/adminRoles to create the role
  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: createRoleBody,
    });
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // 4. Validate key fields match the request payload
  TestValidator.equals(
    "admin role code must match input",
    createdRole.code,
    createRoleBody.code,
  );
  TestValidator.equals(
    "admin role name must match input",
    createdRole.name,
    createRoleBody.name,
  );
  TestValidator.equals(
    "admin role description must match input",
    createdRole.description ?? null,
    createRoleBody.description ?? null,
  );
  TestValidator.equals(
    "admin role is_system flag must match input",
    createdRole.is_system,
    createRoleBody.is_system,
  );

  // 5. Validate lifecycle and soft-delete fields
  TestValidator.equals(
    "admin role deleted_at must be null on creation",
    createdRole.deleted_at ?? null,
    null,
  );

  // Optional: created_at and updated_at should be identical at creation
  TestValidator.equals(
    "admin role created_at and updated_at should be equal on initial creation",
    createdRole.created_at,
    createdRole.updated_at,
  );
}
