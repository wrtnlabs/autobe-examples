import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Validate that creating two admin roles with the same business code is
 * rejected.
 *
 * Business context: The shopping mall RBAC system stores admin roles in the
 * `shopping_mall_admin_roles` table. Each role is identified by a stable,
 * globally unique `code` used in permission checks and assignments. The API
 * must enforce that this `code` remains unique; otherwise, RBAC semantics
 * become ambiguous.
 *
 * This test exercises that uniqueness constraint end-to-end:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authenticated
 *    context.
 * 2. Create a new admin role via POST /shoppingMall/admin/adminRoles with a fresh
 *    `code` and verify the role is created correctly.
 * 3. Attempt to create another admin role with the exact same `code` but different
 *    name/description and assert that the API call fails (duplicate code).
 * 4. Fetch the role via GET /shoppingMall/admin/adminRoles/{adminRoleCode} and
 *    verify only the original role data exists.
 */
export async function test_api_admin_role_creation_duplicate_code_rejected(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin using /auth/admin/join
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create first admin role with a unique code
  const roleCode = `risk_reviewer_${RandomGenerator.alphaNumeric(8)}`;
  const firstRoleBody = {
    code: roleCode,
    name: "Risk Reviewer",
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  const firstCreatedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: firstRoleBody,
    });
  typia.assert<IShoppingMallAdminRole>(firstCreatedRole);

  TestValidator.equals(
    "created role code should match requested code",
    firstCreatedRole.code,
    roleCode,
  );
  TestValidator.equals(
    "created role name should match requested name",
    firstCreatedRole.name,
    firstRoleBody.name,
  );
  TestValidator.equals(
    "created role is_system flag should be false",
    firstCreatedRole.is_system,
    false,
  );

  // 3. Try to create a second role with the same code - expect business error
  const secondRoleBody = {
    code: roleCode, // same code to trigger uniqueness violation
    name: "Duplicated Risk Reviewer",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    is_system: false,
  } satisfies IShoppingMallAdminRole.ICreate;

  await TestValidator.error(
    "duplicate admin role code should be rejected",
    async () => {
      await api.functional.shoppingMall.admin.adminRoles.create(connection, {
        body: secondRoleBody,
      });
    },
  );

  // 4. Read back the role and confirm only original data is present
  const fetchedRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.admin.adminRoles.at(connection, {
      adminRoleCode: roleCode,
    });
  typia.assert<IShoppingMallAdminRole>(fetchedRole);

  TestValidator.equals(
    "fetched role code should equal original created code",
    fetchedRole.code,
    roleCode,
  );
  TestValidator.equals(
    "fetched role name should equal first created role name (not second)",
    fetchedRole.name,
    firstRoleBody.name,
  );
  TestValidator.equals(
    "fetched role is_system should remain false",
    fetchedRole.is_system,
    false,
  );
}
