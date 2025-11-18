import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Validate creation of a system-protected admin role.
 *
 * Business goal: Ensure that an authenticated shopping mall administrator can
 * create a system-protected RBAC role via POST /shoppingMall/admin/adminRoles,
 * and that the resulting role entity correctly reflects system-level metadata
 * such as `is_system` and lifecycle timestamps.
 *
 * End-to-end flow:
 *
 * 1. Register a new admin via POST /auth/admin/join to bootstrap an authenticated
 *    admin context. The SDK will automatically propagate the access token into
 *    the connection headers.
 * 2. Using the authenticated connection, call POST /shoppingMall/admin/adminRoles
 *    with an `IShoppingMallAdminRole.ICreate` payload representing a powerful
 *    system role (e.g., code "super_admin").
 * 3. Validate that the response is a fully populated `IShoppingMallAdminRole`
 *    object with `is_system` set to true, timestamps populated, and no soft
 *    deletion.
 */
export async function test_api_admin_role_creation_with_system_flag(
  connection: api.IConnection,
) {
  // 1. Register a new admin to obtain an authenticated context.
  // Use realistic join payload fields based on IShoppingMallAdminJoin.ICreate.
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: typia.random<
      | (string & tags.Format<"ipv4">)
      | (string & tags.Format<"ipv6">)
      | null
      | undefined
    >(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(authorizedAdmin);

  // Basic sanity checks on the authorized admin context.
  TestValidator.predicate(
    "admin id should be a non-empty uuid string",
    typeof authorizedAdmin.id === "string" && authorizedAdmin.id.length > 0,
  );
  TestValidator.predicate(
    "admin email should match join email",
    authorizedAdmin.email === adminJoinBody.email,
  );
  TestValidator.predicate(
    "admin token access should be a non-empty string",
    typeof authorizedAdmin.token.access === "string" &&
      authorizedAdmin.token.access.length > 0,
  );

  // 2. Create a system-protected admin role.
  const roleRequestBody = {
    code: "super_admin",
    name: "Super Administrator",
    description:
      "System-level role reserved for core platform operators with full administrative privileges.",
    is_system: true,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: roleRequestBody,
    });
  typia.assert(createdRole);

  // 3. Validate system role metadata and core fields.
  TestValidator.equals(
    "created role code should echo request code",
    createdRole.code,
    roleRequestBody.code,
  );
  TestValidator.equals(
    "created role name should echo request name",
    createdRole.name,
    roleRequestBody.name,
  );
  TestValidator.equals(
    "created role is_system flag should be true",
    createdRole.is_system,
    true,
  );

  // Description is optional, but when provided it should be echoed back.
  TestValidator.equals(
    "created role description should echo request description",
    createdRole.description ?? null,
    roleRequestBody.description ?? null,
  );

  // Lifecycle timestamps: created_at and updated_at must be non-empty
  // date-time strings, and deleted_at should be null or undefined for
  // a fresh record.
  TestValidator.predicate(
    "created_at should be a non-empty date-time string",
    typeof createdRole.created_at === "string" &&
      createdRole.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a non-empty date-time string",
    typeof createdRole.updated_at === "string" &&
      createdRole.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at should be null or undefined for a newly created role",
    createdRole.deleted_at === null || createdRole.deleted_at === undefined,
  );
}
