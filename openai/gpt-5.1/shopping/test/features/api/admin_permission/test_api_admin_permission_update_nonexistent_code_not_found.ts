import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Verify that updating a non-existent admin permission code fails with a
 * not-found style error and does not create any new permission record.
 *
 * Business context: Administrative permissions are centrally managed RBAC
 * primitives. Updating a permission by its business code must only succeed when
 * that permission already exists. A request that targets a non-existent code
 * must fail and must not create a new permission record implicitly.
 *
 * Scenario steps:
 *
 * 1. Join as an admin using POST /auth/admin/join to obtain an authenticated admin
 *    context.
 * 2. Choose a synthetic permission code string that is extremely unlikely to exist
 *    (e.g., a long random value with a fixed prefix).
 * 3. Call PUT /shoppingMall/admin/adminPermissions/{adminPermissionCode} with that
 *    non-existent code using the admin session.
 * 4. Assert that the update call fails with an HTTP client error, which in a
 *    typical implementation represents a not-found style business error.
 * 5. Call GET /shoppingMall/admin/adminPermissions/{adminPermissionCode} with the
 *    same code and assert that it also fails, proving that the failed update
 *    did not create the permission.
 */
export async function test_api_admin_permission_update_nonexistent_code_not_found(
  connection: api.IConnection,
) {
  // 1. Establish an authenticated admin session by joining.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Prepare a clearly non-existent permission code.
  const nonExistentCode = `nonexistent.permission.${RandomGenerator.alphaNumeric(24)}`;

  // 3. Attempt to update the non-existent permission code.
  //    The update SDK function only accepts the path parameter.
  await TestValidator.httpError(
    "updating non-existent admin permission code should fail",
    [400, 404, 422],
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.update(
        connection,
        {
          adminPermissionCode: nonExistentCode,
        },
      );
    },
  );

  // 4. Verify that a subsequent GET still fails for the same code,
  //    ensuring that the failed update did not create a new record.
  await TestValidator.httpError(
    "reading non-existent admin permission after failed update should still fail",
    [400, 404, 422],
    async () => {
      await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
        adminPermissionCode: nonExistentCode,
      });
    },
  );
}
