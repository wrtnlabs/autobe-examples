import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Validate audit timestamps on admin role creation and retrieval.
 *
 * Business purpose
 *
 * - Ensure that when a new admin role is created via POST
 *   /shoppingMall/admin/adminRoles, the audit fields `created_at` and
 *   `updated_at` are populated as valid ISO 8601 date-time strings, and that
 *   `deleted_at` is null/undefined for an active role.
 * - Confirm that an authenticated admin context obtained via POST
 *   /auth/admin/join is sufficient to create roles and that the SDK correctly
 *   wires the Authorization header.
 * - Verify that timestamps are stable and consistent when re-reading the role
 *   with GET /shoppingMall/admin/adminRoles/{adminRoleCode}.
 *
 * Test steps
 *
 * 1. Join as an admin using POST /auth/admin/join with a valid
 *    IShoppingMallAdminJoin.ICreate payload to establish admin authentication.
 * 2. Create an admin role with POST /shoppingMall/admin/adminRoles using a unique
 *    code, random name, optional description, and is_system=false.
 * 3. Assert on the creation response:
 *
 *    - Created_at and updated_at are valid date-time strings (enforced by
 *         typia.assert)
 *    - Deleted_at is null or undefined (role is active)
 *    - Created_at and updated_at are equal on initial insert.
 * 4. Re-fetch the same role by code using GET
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}.
 * 5. Assert on the fetched role:
 *
 *    - It passes typia.assert
 *    - Created_at matches the value from creation
 *    - Updated_at matches the value from creation
 *    - Deleted_at is still null/undefined
 */
export async function test_api_admin_role_creation_audit_timestamps(
  connection: api.IConnection,
) {
  // 1. Join as admin to obtain authenticated context
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // 2. Create a new admin role with a unique code
  const roleCode = `e2e_role_${RandomGenerator.alphaNumeric(12)}`;
  const createBody = {
    code: roleCode,
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: createBody,
    });
  typia.assert(createdRole);

  // 3. Validate timestamps on creation response
  TestValidator.predicate(
    "created role code should match request code",
    createdRole.code === roleCode,
  );

  // created_at and updated_at must be defined and valid date-time strings
  const createdAt: string & tags.Format<"date-time"> = createdRole.created_at;
  const updatedAt: string & tags.Format<"date-time"> = createdRole.updated_at;

  // deleted_at should be null or undefined on fresh creation
  TestValidator.predicate(
    "deleted_at should be null or undefined on creation",
    createdRole.deleted_at === null || createdRole.deleted_at === undefined,
  );

  // On initial creation, created_at and updated_at should be equal
  TestValidator.equals(
    "created_at and updated_at should be equal on initial creation",
    createdAt,
    updatedAt,
  );

  // 4. Re-fetch the role via GET /shoppingMall/admin/adminRoles/{adminRoleCode}
  const fetchedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.at(connection, {
      adminRoleCode: roleCode,
    });
  typia.assert(fetchedRole);

  // 5. Validate consistency between created and fetched records
  TestValidator.equals(
    "created_at should be stable between create and fetch",
    fetchedRole.created_at,
    createdRole.created_at,
  );
  TestValidator.equals(
    "updated_at should be stable between create and fetch",
    fetchedRole.updated_at,
    createdRole.updated_at,
  );
  TestValidator.equals(
    "deleted_at should remain null/undefined between create and fetch",
    fetchedRole.deleted_at ?? null,
    createdRole.deleted_at ?? null,
  );
}
