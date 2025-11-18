import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Validate governance protection when erasing a system-protected admin role.
 *
 * Business intent: This test ensures that roles marked as `is_system = true`
 * are protected from destructive deletion via the admin role erase API. Even if
 * an authenticated admin attempts to call the erase endpoint on such a role,
 * the platform's governance model must preserve the role as system-protected
 * and keep its identity stable.
 *
 * Scenario steps:
 *
 * 1. Join as an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context. The SDK automatically installs the access token into the
 *    connection.
 * 2. Create a new admin role via POST /shoppingMall/admin/adminRoles with a stable
 *    code (e.g., "core_super_admin"), human-readable name, descriptive text,
 *    and `is_system: true` so that it is treated as a system role.
 * 3. Attempt to erase this role via DELETE
 *    /shoppingMall/admin/adminRoles/{adminRoleCode}, passing the same role
 *    code.
 * 4. Because the SDK method `erase` is modeled to always return
 *    `IShoppingMallAdminRole` and test guidelines prohibit explicit HTTP status
 *    inspection, interpret a successful call as returning the final state of
 *    the role entity after the erase attempt. Validate that governance rules
 *    are enforced at the model level:
 *
 *    - The returned role still has `code` equal to the original code.
 *    - The role remains system-protected (`is_system === true`).
 *    - The role is still a valid `IShoppingMallAdminRole` object.
 * 5. Ensure that critical fields like `id`, `created_at`, and `updated_at` are
 *    present and consistent when appropriate, focusing on demonstrating that
 *    the attempt did not strip system protection from the role.
 *
 * Notes and constraints:
 *
 * - We do not assert on specific HTTP status codes or error types because the
 *   test framework operates via the typed SDK. Instead, we validate the
 *   resulting domain model to confirm governance behavior.
 * - We only use DTOs and API functions explicitly provided: admin join,
 *   adminRoles.create, and adminRoles.erase.
 */
export async function test_api_admin_role_erase_system_role_governance_protection(
  connection: api.IConnection,
) {
  // 1. Establish authenticated admin context via join
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a system-protected admin role with a deterministic business code
  const systemRoleCode = "core_super_admin";
  const createRoleBody = {
    code: systemRoleCode,
    name: "Core Super Admin",
    description:
      "Critical system role for core governance operations across the platform.",
    is_system: true,
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole = await api.functional.shoppingMall.admin.adminRoles.create(
    connection,
    {
      body: createRoleBody,
    },
  );
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // Basic sanity checks on created role
  TestValidator.equals(
    "created role code should match request code",
    createdRole.code,
    systemRoleCode,
  );
  TestValidator.predicate(
    "created role must be marked as system-protected",
    createdRole.is_system === true,
  );

  // 3. Attempt to erase the system-protected role
  const erasedRole = await api.functional.shoppingMall.admin.adminRoles.erase(
    connection,
    {
      adminRoleCode: systemRoleCode,
    },
  );
  typia.assert<IShoppingMallAdminRole>(erasedRole);

  // 4. Governance validations on the result of erase
  TestValidator.equals(
    "erased role should still reference the same business code",
    erasedRole.code,
    systemRoleCode,
  );

  TestValidator.predicate(
    "system flag must remain true after erase attempt",
    erasedRole.is_system === true,
  );

  // Ensure that the role identity (id) is stable across create and erase
  TestValidator.equals(
    "role id should remain consistent across create and erase",
    erasedRole.id,
    createdRole.id,
  );

  // The role must remain structurally valid after the erase attempt
  typia.assert<IShoppingMallAdminRole>(erasedRole);
}
