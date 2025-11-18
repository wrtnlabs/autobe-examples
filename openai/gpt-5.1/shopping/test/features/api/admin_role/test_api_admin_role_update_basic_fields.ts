import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Update mutable fields of a non-system admin role while preserving immutable
 * identifiers.
 *
 * Business purpose
 *
 * - Ensure that an authenticated admin can update `name` and `description` of a
 *   role identified by its stable `code`.
 * - Verify that `code` and lifecycle identifiers remain immutable and that audit
 *   timestamps behave correctly.
 *
 * Workflow
 *
 * 1. Join an admin account using POST /auth/admin/join to establish an
 *    authenticated admin session (SDK updates Authorization header
 *    automatically).
 * 2. Create an initial non-system admin role using POST
 *    /shoppingMall/admin/adminRoles with deterministic fields:
 *
 *    - Code: "support_admin"
 *    - Name: "Support Administrator"
 *    - Description: "Handles support operations"
 *    - Is_system: false
 * 3. Immediately after creation, capture the original role state (originalName,
 *    originalDescription, originalIsSystem, createdAt, updatedAt).
 * 4. Call PUT /shoppingMall/admin/adminRoles/{adminRoleCode} with
 *    adminRoleCode="support_admin" and a body of type
 *    IShoppingMallAdminRole.IUpdate that:
 *
 *    - Sets name to a new value, e.g. "Customer Support Admin".
 *    - Sets description to another descriptive text, e.g. "Handles customer support
 *         inquiries".
 *    - Omits is_system so that the existing value is preserved by partial update
 *         semantics.
 * 5. Validate the response IShoppingMallAdminRole:
 *
 *    - Code is still "support_admin".
 *    - Name equals the new value.
 *    - Description equals the new value, not the original one.
 *    - Is_system remains unchanged and still false.
 *    - Created_at remains equal to the original created_at.
 *    - Updated_at is different from (and chronologically after or equal to) the
 *         original updated_at (string comparison of ISO timestamps can use
 *         lexicographical ordering to assert monotonicity).
 *
 * Additional validations
 *
 * - Ensure typia.assert() passes for all API responses, proving schema
 *   compliance.
 * - Use TestValidator.equals / notEquals / predicate with descriptive titles for
 *   each business rule.
 */
export async function test_api_admin_role_update_basic_fields(
  connection: api.IConnection,
) {
  // 1. Join an admin account to obtain an authenticated admin context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create initial non-system role with fixed code/name/description/is_system
  const createRoleBody = {
    code: "support_admin",
    name: "Support Administrator",
    description: "Handles support operations",
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: createRoleBody,
    });
  typia.assert(createdRole);

  const originalCode = createdRole.code;
  const originalName = createdRole.name;
  const originalDescription = createdRole.description ?? null;
  const originalIsSystem = createdRole.is_system;
  const originalCreatedAt = createdRole.created_at;
  const originalUpdatedAt = createdRole.updated_at;

  TestValidator.equals(
    "created role code should match input code",
    createdRole.code,
    createRoleBody.code,
  );
  TestValidator.equals(
    "created role name should match input name",
    createdRole.name,
    createRoleBody.name,
  );
  TestValidator.equals(
    "created role description should match input description",
    createdRole.description ?? null,
    createRoleBody.description ?? null,
  );
  TestValidator.equals(
    "created role is_system should match input is_system",
    createdRole.is_system,
    createRoleBody.is_system,
  );

  // 3. Prepare update payload: change name and description, omit is_system
  const updatedName = "Customer Support Admin";
  const updatedDescription = "Handles customer support inquiries";

  const updateRoleBody = {
    name: updatedName,
    description: updatedDescription,
    // is_system intentionally omitted to preserve original value
  } satisfies IShoppingMallAdminRole.IUpdate;

  const updatedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.update(connection, {
      adminRoleCode: "support_admin",
      body: updateRoleBody,
    });
  typia.assert(updatedRole);

  // 4. Business rule validations after update
  TestValidator.equals(
    "role code should remain immutable after update",
    updatedRole.code,
    originalCode,
  );

  TestValidator.equals(
    "role name should be updated to new value",
    updatedRole.name,
    updatedName,
  );

  TestValidator.equals(
    "role description should be updated to new value",
    updatedRole.description ?? null,
    updatedDescription,
  );

  TestValidator.equals(
    "is_system flag should remain unchanged after update",
    updatedRole.is_system,
    originalIsSystem,
  );

  TestValidator.equals(
    "created_at should remain unchanged after update",
    updatedRole.created_at,
    originalCreatedAt,
  );

  TestValidator.notEquals(
    "updated_at should change after role update",
    updatedRole.updated_at,
    originalUpdatedAt,
  );

  TestValidator.predicate(
    "updated_at should be chronologically after or equal to original updated_at",
    updatedRole.updated_at >= originalUpdatedAt,
  );
}
