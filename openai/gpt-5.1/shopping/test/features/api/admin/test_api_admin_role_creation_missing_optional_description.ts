import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

export async function test_api_admin_role_creation_missing_optional_description(
  connection: api.IConnection,
) {
  /**
   * Scenario: create an admin role without a description and verify that the
   * nullable optional field is persisted and retrieved as null.
   *
   * Steps:
   *
   * 1. Join an admin using POST /auth/admin/join which also authenticates the
   *    connection for subsequent admin-only endpoints.
   * 2. Create a new admin role via POST /shoppingMall/admin/adminRoles with
   *    description explicitly set to null in IShoppingMallAdminRole.ICreate.
   * 3. Validate the creation response IShoppingMallAdminRole: description must be
   *    null and all other core fields match input.
   * 4. Fetch the same role via GET /shoppingMall/admin/adminRoles/{adminRoleCode}
   *    using the role code, and verify description is still null and core
   *    fields are consistent with the created role.
   */

  // 1. Register an admin and authenticate the connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // Optional ip: let it be undefined to let server-side defaults work
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a new admin role with description explicitly set to null
  const uniqueSuffix = RandomGenerator.alphaNumeric(8);
  const roleCode = `e2e_role_no_desc_${uniqueSuffix}`;

  const createRoleBody = {
    code: roleCode,
    name: RandomGenerator.name(),
    description: null,
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: createRoleBody,
    });
  typia.assert(createdRole);

  // Validate creation response
  TestValidator.equals(
    "created role code should match request code",
    createdRole.code,
    createRoleBody.code,
  );
  TestValidator.equals(
    "created role name should match request name",
    createdRole.name,
    createRoleBody.name,
  );
  TestValidator.equals(
    "created role is_system should be false",
    createdRole.is_system,
    false,
  );
  TestValidator.equals(
    "created role description should be null when created with null",
    createdRole.description,
    null,
  );

  // 3. Fetch the same role by code and verify persistence of null description
  const fetchedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.at(connection, {
      adminRoleCode: roleCode,
    });
  typia.assert(fetchedRole);

  TestValidator.equals(
    "fetched role code should match created role code",
    fetchedRole.code,
    createdRole.code,
  );
  TestValidator.equals(
    "fetched role name should match created role name",
    fetchedRole.name,
    createdRole.name,
  );
  TestValidator.equals(
    "fetched role is_system should match created role is_system",
    fetchedRole.is_system,
    createdRole.is_system,
  );
  TestValidator.equals(
    "fetched role description should remain null",
    fetchedRole.description,
    null,
  );
}
