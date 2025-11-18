import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Validate basic happy-path creation and retrieval of a non-system admin role.
 *
 * Business goal:
 *
 * - Ensure a freshly registered admin can create a non-system RBAC role in
 *   shopping_mall_admin_roles and immediately retrieve it by its business
 *   code.
 * - Confirm that persisted data matches the creation payload where applicable and
 *   that lifecycle flags/timestamps behave as expected.
 *
 * Steps:
 *
 * 1. Join a new admin account using POST /auth/admin/join to establish an
 *    authenticated admin context (tokens are handled by SDK).
 * 2. Create a new admin role via POST /shoppingMall/admin/adminRoles with
 *    IShoppingMallAdminRole.ICreate, using a unique code, name, description,
 *    and is_system=false.
 * 3. Validate the creation response structure and core fields.
 * 4. Fetch the role by its business code using GET
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}.
 * 5. Assert that the fetched role matches the created role and key business
 *    invariants hold.
 */
export async function test_api_admin_role_creation_basic_flow(
  connection: api.IConnection,
) {
  // 1. Join a new admin to obtain authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a new non-system admin role
  const roleCodeBase = RandomGenerator.alphabets(8);
  const roleCode = `ops_admin_${roleCodeBase}`;

  const createBody = {
    code: roleCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: createBody,
    });
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // 3. Validate creation response fields
  TestValidator.equals(
    "created role code matches request",
    createdRole.code,
    createBody.code,
  );
  TestValidator.equals(
    "created role name matches request",
    createdRole.name,
    createBody.name,
  );
  TestValidator.equals(
    "created role description matches request (nullable)",
    createdRole.description ?? null,
    createBody.description ?? null,
  );
  TestValidator.equals(
    "created role is_system is false",
    createdRole.is_system,
    false,
  );

  // created_at and updated_at must be non-null ISO timestamps
  TestValidator.predicate(
    "created_at is non-empty ISO date-time",
    createdRole.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is non-empty ISO date-time",
    createdRole.updated_at.length > 0,
  );

  // deleted_at should be null or undefined for a fresh active role
  TestValidator.predicate(
    "deleted_at is null or undefined on fresh role",
    createdRole.deleted_at === null || createdRole.deleted_at === undefined,
  );

  // 4. Read back the role by its business code
  const fetchedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.at(connection, {
      adminRoleCode: roleCode,
    });
  typia.assert<IShoppingMallAdminRole>(fetchedRole);

  // 5. Assert fetched role matches created role
  TestValidator.equals(
    "fetched role equals created role (deep)",
    fetchedRole,
    createdRole,
  );

  // Core invariants on fetched role
  TestValidator.equals("fetched role code matches", fetchedRole.code, roleCode);
  TestValidator.equals(
    "fetched role is_system is false",
    fetchedRole.is_system,
    false,
  );
  TestValidator.predicate(
    "fetched role timestamps non-empty",
    fetchedRole.created_at.length > 0 && fetchedRole.updated_at.length > 0,
  );

  TestValidator.predicate(
    "fetched role deleted_at remains null or undefined",
    fetchedRole.deleted_at === null || fetchedRole.deleted_at === undefined,
  );
}
