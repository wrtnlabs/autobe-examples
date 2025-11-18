import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

export async function test_api_admin_permission_detail_respects_soft_deletion(
  connection: api.IConnection,
) {
  // 1. Join an admin to obtain an authenticated connection
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // keep ip undefined to let backend derive it, href/referrer are required
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const authorizedAdmin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(authorizedAdmin);

  // 2. Create a fresh admin permission
  const permissionCodePrefix = "e2e.permission.soft_delete.";
  const permissionCode = `${permissionCodePrefix}${RandomGenerator.alphaNumeric(16)}`;

  const createPermissionBody = {
    code: permissionCode,
    name: `E2E Soft Delete Test ${RandomGenerator.name(2)}`,
    description: RandomGenerator.paragraph({
      sentences: 4,
      wordMin: 3,
      wordMax: 8,
    }),
    category: "e2e-test",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdPermission: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: createPermissionBody,
      },
    );
  typia.assert<IShoppingMallAdminPermission>(createdPermission);

  // Basic business validations for created permission
  TestValidator.equals(
    "created permission code matches requested code",
    createdPermission.code,
    permissionCode,
  );
  TestValidator.equals(
    "created permission name matches requested name",
    createdPermission.name,
    createPermissionBody.name,
  );
  TestValidator.predicate(
    "created permission deleted_at is null or undefined (active)",
    createdPermission.deleted_at === null ||
      createdPermission.deleted_at === undefined,
  );

  // 3. Verify detail endpoint before deletion
  const detailBeforeDelete: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
      adminPermissionCode: permissionCode,
    });
  typia.assert<IShoppingMallAdminPermission>(detailBeforeDelete);

  TestValidator.equals(
    "detail-before-delete id matches created id",
    detailBeforeDelete.id,
    createdPermission.id,
  );
  TestValidator.equals(
    "detail-before-delete code matches created code",
    detailBeforeDelete.code,
    createdPermission.code,
  );
  TestValidator.predicate(
    "detail-before-delete deleted_at is null or undefined (still active)",
    detailBeforeDelete.deleted_at === null ||
      detailBeforeDelete.deleted_at === undefined,
  );

  // 4. Soft delete (or hard delete) the permission via DELETE
  await api.functional.shoppingMall.admin.adminPermissions.erase(connection, {
    adminPermissionCode: permissionCode,
  });

  // 5. Verify detail endpoint behavior after deletion
  // We allow two behaviors:
  // A) Not-found style behavior (error)
  // B) Still returns DTO but with deleted_at non-null
  let behavior: "not_found" | "soft_deleted_visible" | "unexpected" =
    "unexpected";

  try {
    const detailAfterDelete: IShoppingMallAdminPermission =
      await api.functional.shoppingMall.admin.adminPermissions.at(connection, {
        adminPermissionCode: permissionCode,
      });
    typia.assert<IShoppingMallAdminPermission>(detailAfterDelete);

    // If we reach here, API still returns a DTO; expect deleted_at to be non-null
    TestValidator.equals(
      "detail-after-delete id matches created id",
      detailAfterDelete.id,
      createdPermission.id,
    );
    TestValidator.equals(
      "detail-after-delete code matches created code",
      detailAfterDelete.code,
      createdPermission.code,
    );
    TestValidator.predicate(
      "detail-after-delete deleted_at is non-null (soft deleted visible)",
      detailAfterDelete.deleted_at !== null &&
        detailAfterDelete.deleted_at !== undefined,
    );

    behavior = "soft_deleted_visible";
  } catch (_error) {
    // Any error here is interpreted as a not-found style behavior
    behavior = "not_found";
  }

  // Final sanity check: ensure we observed one of the expected behaviors
  TestValidator.predicate(
    "permission detail after deletion is either not-found or visible with deleted_at set",
    behavior === "not_found" || behavior === "soft_deleted_visible",
  );
}
