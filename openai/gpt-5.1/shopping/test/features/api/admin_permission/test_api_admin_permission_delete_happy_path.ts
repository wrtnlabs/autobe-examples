import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Happy-path validation for deleting an admin permission by its business code.
 *
 * Business context:
 *
 * - Admin permissions are RBAC units stored in `shopping_mall_admin_permissions`.
 * - They are addressed by a stable business code (e.g. `orders.refund.approve`).
 * - Only authenticated admins can manage this catalog.
 *
 * This scenario ensures an authenticated administrator can:
 *
 * 1. Register as an admin and obtain an authenticated connection.
 * 2. Create a new admin permission with a unique business code.
 * 3. Read that permission back by its code.
 * 4. Delete the permission using the same business code.
 * 5. Confirm that the permission is no longer retrievable afterwards.
 *
 * Steps:
 *
 * 1. Call POST /auth/admin/join with IShoppingMallAdminJoin.ICreate to create an
 *    admin and let the SDK attach the JWT access token to the connection.
 * 2. Call POST /shoppingMall/admin/adminPermissions with
 *    IShoppingMallAdminPermission.ICreate using a deterministic unique `code`
 *    (e.g. a prefix plus RandomGenerator.alphaNumeric) and some metadata (name,
 *    description, category, is_system=false).
 *
 *    - Assert the response type using typia.assert.
 *    - Validate that the returned permission.code equals the requested code and that
 *         name/description/category reflect the input.
 * 3. Call GET /shoppingMall/admin/adminPermissions/{adminPermissionCode} using the
 *    created permission.code.
 *
 *    - Assert the response type.
 *    - Validate that id and code of the fetched entity match the created one.
 * 4. Call DELETE /shoppingMall/admin/adminPermissions/{adminPermissionCode} with
 *    the same code.
 *
 *    - Ensure the call succeeds (no error is thrown).
 * 5. Call GET /shoppingMall/admin/adminPermissions/{adminPermissionCode} again.
 *
 *    - Wrap this in TestValidator.error to assert that an error is thrown, proving
 *         the record has been removed and is no longer addressable.
 */
export async function test_api_admin_permission_delete_happy_path(
  connection: api.IConnection,
) {
  // 1. Admin join to obtain JWT-authenticated connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new admin permission with a unique business code
  const permissionCodePrefix = "e2e.permission.delete.test";
  const permissionCodeSuffix = RandomGenerator.alphaNumeric(8);
  const permissionCode = `${permissionCodePrefix}.${permissionCodeSuffix}`;

  const createPermissionBody = {
    code: permissionCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "testing",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const created: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: createPermissionBody,
      },
    );
  typia.assert(created);

  // Validate created permission fields
  TestValidator.equals(
    "created permission code should match input",
    created.code,
    permissionCode,
  );
  TestValidator.equals(
    "created permission name should match input",
    created.name,
    createPermissionBody.name,
  );
  TestValidator.equals(
    "created permission description should match input",
    created.description,
    createPermissionBody.description,
  );
  TestValidator.equals(
    "created permission category should match input",
    created.category,
    createPermissionBody.category,
  );
  TestValidator.equals(
    "created permission is_system should be false",
    created.is_system,
    false,
  );

  // 3. Fetch the permission by its business code and validate
  const fetched: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert(fetched);

  TestValidator.equals(
    "fetched permission id should equal created id",
    fetched.id,
    created.id,
  );
  TestValidator.equals(
    "fetched permission code should equal created code",
    fetched.code,
    created.code,
  );

  // 4. Delete the permission by its code
  await api.functional.shoppingMall.admin.adminPermissions.erase(connection, {
    adminPermissionCode: permissionCode,
  });

  // 5. Ensure subsequent GET fails, proving deletion took effect
  await TestValidator.error(
    "fetching deleted admin permission by code should fail",
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
        adminPermissionCode: permissionCode,
      });
    },
  );
}
