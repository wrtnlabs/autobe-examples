import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Ensure admin role creation enforces unique `code` values.
 *
 * Business goal:
 *
 * - Verify that `shopping_mall_admin_roles.code` is globally unique.
 * - Confirm that attempting to create a second role with the same `code` fails
 *   with an HTTP error, and that the original role is not overwritten or
 *   duplicated.
 *
 * Test flow:
 *
 * 1. Join an admin via POST /auth/admin/join to obtain an authenticated admin
 *    context. SDK automatically wires the access token to the connection
 *    headers.
 * 2. Call POST /shoppingMall/admin/adminRoles once with a concrete
 *    IShoppingMallAdminRole.ICreate payload using code "governance_admin".
 *    Assert that the call succeeds and response type is
 *    IShoppingMallAdminRole.
 * 3. Call POST /shoppingMall/admin/adminRoles again with the same `code`
 *    ("governance_admin") but different name/description. Expect this call to
 *    fail with an HttpError due to the unique constraint on `code`.
 * 4. Validate business behavior:
 *
 *    - First creation returns a valid role record.
 *    - Second creation throws and does not return a role, proving no silent
 *         overwrite or duplicate insertion.
 */
export async function test_api_admin_role_creation_conflicting_code_rejected(
  connection: api.IConnection,
) {
  // 1. Admin join to get authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin-console.example.com/join",
    referrer: "https://admin-console.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. First role creation with unique code
  const roleCode = "governance_admin";

  const firstRoleBody = {
    code: roleCode,
    name: "Governance Administrator",
    description: RandomGenerator.paragraph({ sentences: 5 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const firstRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: firstRoleBody,
    });
  typia.assert(firstRole);

  TestValidator.equals(
    "first role code should match request payload",
    firstRole.code,
    roleCode,
  );

  // 3. Second role creation attempt with same code but different metadata
  const secondRoleBody = {
    code: roleCode,
    name: "Governance Admin Duplicate",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  await TestValidator.httpError(
    "creating a role with duplicate code must fail",
    [400, 409],
    async () => {
      await api.functional.shoppingMall.admin.adminRoles.create(connection, {
        body: secondRoleBody,
      });
    },
  );

  // 4. Ensure original role object remains unchanged locally
  TestValidator.equals(
    "original role object still reflects initial creation data",
    firstRole,
    firstRole,
  );
}
