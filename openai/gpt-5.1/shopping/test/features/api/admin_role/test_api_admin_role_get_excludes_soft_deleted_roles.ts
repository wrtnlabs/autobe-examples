import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Verify that GET /shoppingMall/platformAdmin/adminRoles/{adminRoleCode} does
 * not return roles that have been soft-deleted.
 *
 * Business context:
 *
 * - Admin roles live in `shopping_mall_admin_roles` with a unique `code` and
 *   nullable `deleted_at` timestamp for soft deletion.
 * - DELETE /shoppingMall/platformAdmin/adminRoles/{adminRoleCode} marks roles as
 *   logically deleted by setting `deleted_at`, rather than physically deleting
 *   the row.
 * - The GET-by-code endpoint must expose only active roles (deleted_at = null).
 *
 * Scenario steps:
 *
 * 1. Join as a platform admin to establish an authenticated session.
 * 2. Create a new admin role with a unique machine-friendly `code`.
 * 3. Confirm the created role fields (code, name, description_text) match the
 *    creation payload and that `deleted_at` is null.
 * 4. Soft-delete the role via DELETE
 *    /shoppingMall/platformAdmin/adminRoles/{adminRoleCode}.
 * 5. Call GET /shoppingMall/platformAdmin/adminRoles/{adminRoleCode} with the same
 *    code and verify that it fails (TestValidator.error), proving that
 *    soft-deleted roles are excluded from the primary read API.
 */
export async function test_api_admin_role_get_excludes_soft_deleted_roles(
  connection: api.IConnection,
) {
  // 1. Bootstrap a platform admin session using the join endpoint.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.shopping-mall.example.com/onboarding",
    referrer: "https://admin.shopping-mall.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(platformAdmin);

  // 2. Create a new admin role with a unique code.
  const roleCode: string = RandomGenerator.alphaNumeric(12);

  const createBody = {
    code: roleCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const createdRole: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdRole);

  // Validate that the created role matches the creation payload where applicable.
  TestValidator.equals(
    "created role code should match request payload",
    createdRole.code,
    createBody.code,
  );
  TestValidator.equals(
    "created role name should match request payload",
    createdRole.name,
    createBody.name,
  );
  TestValidator.equals(
    "created role description_text should match request payload",
    createdRole.description_text,
    createBody.description_text,
  );
  TestValidator.equals(
    "created role should be active (deleted_at is null)",
    createdRole.deleted_at ?? null,
    null,
  );

  // 3. Soft-delete the role using the DELETE endpoint.
  await api.functional.shoppingMall.platformAdmin.adminRoles.erase(connection, {
    adminRoleCode: createdRole.code,
  });

  // 4. Attempt to fetch the same role by code and expect failure.
  await TestValidator.error(
    "soft-deleted admin role should not be retrievable by GET-by-code",
    async () => {
      await api.functional.shoppingMall.platformAdmin.adminRoles.at(
        connection,
        {
          adminRoleCode: createdRole.code,
        },
      );
    },
  );
}
