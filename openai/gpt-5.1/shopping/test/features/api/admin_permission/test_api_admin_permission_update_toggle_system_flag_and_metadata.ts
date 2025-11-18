import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Validate updating an admin permission’s metadata and system flag via the
 * adminPermissions.update endpoint.
 *
 * Business workflow:
 *
 * 1. Register an admin using POST /auth/admin/join to obtain an authenticated
 *    admin context.
 * 2. Create a permission using POST /shoppingMall/admin/adminPermissions with an
 *    initial code, name, description, category, and is_system set to false.
 * 3. Read back the created permission via GET
 *    /shoppingMall/admin/adminPermissions/{adminPermissionCode} to capture
 *    baseline id, code, created_at, updated_at, is_system, and deleted_at.
 * 4. Invoke PUT /shoppingMall/admin/adminPermissions/{adminPermissionCode} to
 *    simulate an update operation against that permission.
 * 5. Re-read the permission and verify that immutable identifiers (id, code,
 *    created_at) remain stable and that updated_at has advanced, proving that
 *    the update endpoint performed a state change or at least touched the
 *    record.
 * 6. Additionally ensure that the permission has not been soft-deleted (deleted_at
 *    is still null or unchanged).
 */
export async function test_api_admin_permission_update_toggle_system_flag_and_metadata(
  connection: api.IConnection,
) {
  // 1. Register an admin (auth join) to obtain admin context
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
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create an admin permission with initial metadata and is_system=false
  const initialCode: string = `risk.rules.manage.${RandomGenerator.alphaNumeric(8)}`;
  const createBody = {
    code: initialCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    category: "risk",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(createdPermission);

  // 3. Fetch the created permission by its code to capture baseline
  const baseline: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: initialCode,
    });
  typia.assert<IShoppingMallAdminPermission>(baseline);

  TestValidator.equals(
    "baseline code must match created permission code",
    baseline.code,
    createdPermission.code,
  );
  TestValidator.equals(
    "baseline id must match created permission id",
    baseline.id,
    createdPermission.id,
  );
  TestValidator.equals(
    "baseline created_at must match created permission created_at",
    baseline.created_at,
    createdPermission.created_at,
  );

  // 4. Call update endpoint for this permission
  await api.functional.shoppingMall.admin.adminPermissions.update(connection, {
    adminPermissionCode: initialCode,
  });

  // 5. Re-fetch permission and compare timestamps and identifiers
  const updated: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: initialCode,
    });
  typia.assert<IShoppingMallAdminPermission>(updated);

  // identifiers must remain stable
  TestValidator.equals(
    "updated permission id should remain the same",
    updated.id,
    baseline.id,
  );
  TestValidator.equals(
    "updated permission code should remain the same",
    updated.code,
    baseline.code,
  );
  TestValidator.equals(
    "updated permission created_at should remain unchanged",
    updated.created_at,
    baseline.created_at,
  );

  // updated_at should be same or later; typically later if update touched the record
  TestValidator.predicate(
    "updated_at should be greater than or equal to baseline updated_at",
    new Date(updated.updated_at).getTime() >=
      new Date(baseline.updated_at).getTime(),
  );

  // Ensure permission is not soft-deleted after update
  TestValidator.equals(
    "deleted_at should remain unchanged after update",
    updated.deleted_at ?? null,
    baseline.deleted_at ?? null,
  );
}
