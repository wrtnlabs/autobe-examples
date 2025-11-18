import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Validate partial update semantics for admin roles.
 *
 * Business workflow:
 *
 * 1. Join as an admin via POST /auth/admin/join so that subsequent role management
 *    calls are authenticated in the admin context.
 * 2. Create a concrete role "reporting_admin" via POST
 *    /shoppingMall/admin/adminRoles with deterministic values:
 *
 *    - Code: "reporting_admin"
 *    - Name: "Reporting Administrator"
 *    - Description: "Generates and reviews reports"
 *    - Is_system: false
 * 3. Capture the full created role state including id, code, name, description,
 *    is_system, created_at, updated_at and deleted_at.
 * 4. Issue PUT /shoppingMall/admin/adminRoles/{adminRoleCode} with
 *    adminRoleCode="reporting_admin" and an IShoppingMallAdminRole.IUpdate body
 *    that only sets description to null while omitting name and is_system.
 * 5. Validate that the returned IShoppingMallAdminRole instance:
 *
 *    - Has description === null (explicitly cleared).
 *    - Retains original name and is_system values from the create step.
 *    - Preserves id and code.
 *    - Keeps created_at unchanged while updated_at is later than the previous
 *         updated_at value.
 *
 * This ensures that IShoppingMallAdminRole.IUpdate behaves as a partial update
 * DTO where omitted fields are not modified and explicit null values clear
 * nullable fields.
 */
export async function test_api_admin_role_update_partial_fields(
  connection: api.IConnection,
) {
  // 1. Join as an admin to establish Authorization header context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin-console.local/join",
    referrer: "https://admin-console.local/login",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(authorized);

  // 2. Create the reporting_admin role with deterministic fields.
  const createBody = {
    code: "reporting_admin",
    name: "Reporting Administrator",
    description: "Generates and reviews reports",
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const created: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: createBody,
    });
  typia.assert(created);

  // Basic sanity assertions on created role.
  TestValidator.equals(
    "created role code should match input code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created role name should match input name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created role is_system should match input flag",
    created.is_system,
    createBody.is_system,
  );
  TestValidator.equals(
    "created role description should match input description",
    created.description ?? null,
    createBody.description ?? null,
  );

  // 3. Prepare partial update payload that only clears description.
  const updateBody = {
    description: null,
  } satisfies IShoppingMallAdminRole.IUpdate;

  const updated: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.update(connection, {
      adminRoleCode: created.code,
      body: updateBody,
    });
  typia.assert(updated);

  // 4. Validate identifiers remain stable.
  TestValidator.equals(
    "updated role id should stay the same",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "updated role code should stay the same",
    updated.code,
    created.code,
  );

  // 5. Validate that name and is_system are unchanged.
  TestValidator.equals(
    "updated role should retain original name when name is omitted",
    updated.name,
    created.name,
  );
  TestValidator.equals(
    "updated role should retain original is_system when is_system is omitted",
    updated.is_system,
    created.is_system,
  );

  // 6. Validate that description has been explicitly cleared to null.
  TestValidator.equals(
    "updated role description should be cleared to null when explicitly set to null",
    updated.description ?? null,
    null,
  );

  // 7. Validate timestamps: created_at unchanged, updated_at advanced.
  TestValidator.equals(
    "created_at should remain unchanged after partial update",
    updated.created_at,
    created.created_at,
  );

  // String comparison for ISO timestamps is sufficient for ordering since both
  // values are in the same format and timezone. Still, compare using Date for
  // clarity of intent.
  const createdUpdatedAt = new Date(created.updated_at).getTime();
  const updatedUpdatedAt = new Date(updated.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be later than or equal to previous updated_at after update",
    updatedUpdatedAt >= createdUpdatedAt,
  );
}
