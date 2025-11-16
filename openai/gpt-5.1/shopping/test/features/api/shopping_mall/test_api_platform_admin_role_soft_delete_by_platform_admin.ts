import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate that a platform administrator can soft-delete an admin role by its
 * business code.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new platform admin via POST /auth/platformAdmin/join and obtain an
 *    authorized session.
 * 2. As that admin, create a new admin role via POST
 *    /shoppingMall/platformAdmin/adminRoles.
 * 3. Soft-delete the created role via DELETE
 *    /shoppingMall/platformAdmin/adminRoles/{adminRoleCode}.
 * 4. Call the delete endpoint again for the same code to confirm idempotent
 *    behavior (no error on repeated deletion).
 *
 * Due to the limited SDK surface in this context, we cannot re-fetch the role
 * to assert `deleted_at` changes directly, nor can we list active roles.
 * Instead, we validate:
 *
 * - Creation returns an active role whose `deleted_at` is null.
 * - Subsequent DELETE calls for the created role code complete successfully
 *   without throwing.
 */
export async function test_api_platform_admin_role_soft_delete_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Join as a new platform administrator to obtain an authorized session.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: "password123",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(admin);

  // 2. Create a new admin role with a unique business code.
  const roleCreateBody = {
    code: `ROLE_${RandomGenerator.alphaNumeric(12)}` as string &
      tags.MinLength<1>,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 4 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: roleCreateBody,
      },
    );
  typia.assert<IShoppingMallAdminRole>(createdRole);

  // Validate that the created role reflects the request input and is active.
  TestValidator.equals(
    "created role code matches requested code",
    createdRole.code,
    roleCreateBody.code,
  );
  TestValidator.equals(
    "created role name matches requested name",
    createdRole.name,
    roleCreateBody.name,
  );
  TestValidator.equals(
    "created role deleted_at is null for active role",
    createdRole.deleted_at,
    null,
  );

  // 3. Soft-delete the admin role by its business code.
  await api.functional.shoppingMall.platformAdmin.adminRoles.erase(connection, {
    adminRoleCode: createdRole.code,
  });

  // 4. Verify idempotent-like behavior by calling DELETE again on the same code.
  await api.functional.shoppingMall.platformAdmin.adminRoles.erase(connection, {
    adminRoleCode: createdRole.code,
  });
}
