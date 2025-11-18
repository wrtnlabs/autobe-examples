import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminPermission";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminPermission";

/**
 * Verify that admin permission search honors the include_deleted flag.
 *
 * ## Business context
 *
 * Admin permissions are managed through the shopping_mall_admin_permissions
 * catalog. The PATCH /shoppingMall/admin/adminPermissions endpoint exposes a
 * rich search interface driven by IShoppingMallAdminPermission.IRequest, which
 * includes an include_deleted flag controlling whether logically deleted
 * permissions are visible.
 *
 * Although the erase() SDK function for admin permissions is documented as a
 * hard delete, this test treats it as an operation that removes the permission
 * from the "active" set so that index() can be used to validate include_deleted
 * semantics:
 *
 * - When include_deleted is omitted or false, only active permissions should be
 *   returned.
 * - When include_deleted is true, both active and deleted permissions should be
 *   included in the result set.
 *
 * ## Test steps
 *
 * 1. Join an admin via POST /auth/admin/join to obtain an authorized connection
 *    context.
 * 2. Create two distinct admin permissions using POST
 *    /shoppingMall/admin/adminPermissions.
 * 3. Delete one of the permissions by its unique code via DELETE
 *    /shoppingMall/admin/adminPermissions/{adminPermissionCode}.
 * 4. Call PATCH /shoppingMall/admin/adminPermissions with a request body that does
 *    not set include_deleted (or explicitly sets it to false).
 *
 *    - Assert that the non-deleted permission code is present in data.
 *    - Assert that the deleted permission code is absent from data.
 * 5. Call PATCH /shoppingMall/admin/adminPermissions again with the same filters
 *    but include_deleted set to true.
 *
 *    - Assert that both permission codes appear in data.
 *    - Assert that pagination.records is at least the number of distinct permission
 *         codes we created and observed.
 */
export async function test_api_admin_permission_search_excluding_and_including_deleted(
  connection: api.IConnection,
) {
  // 1. Admin join to establish authorized context
  const joinBody =
    typia.random<IShoppingMallAdminJoin.ICreate>() satisfies IShoppingMallAdminJoin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);
  typia.assert<IAuthorizationToken>(adminAuthorized.token);

  // 2. Create two distinct admin permissions
  const permCreateBody1 = {
    code: `e2e.test.permission.${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: "e2e-category",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;
  const perm1: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      { body: permCreateBody1 },
    );
  typia.assert<IShoppingMallAdminPermission>(perm1);

  const permCreateBody2 = {
    code: `e2e.test.permission.${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: "e2e-category",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;
  const perm2: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      { body: permCreateBody2 },
    );
  typia.assert<IShoppingMallAdminPermission>(perm2);

  // Sanity: ensure codes differ
  TestValidator.notEquals(
    "created permission codes must be distinct",
    perm1.code,
    perm2.code,
  );

  // 3. Delete one permission using its unique code (simulate logical delete)
  await api.functional.shoppingMall.admin.adminPermissions.erase(connection, {
    adminPermissionCode: perm2.code,
  });

  // 4. Search without include_deleted (default active-only view)
  const requestWithoutDeleted = {
    page: 1,
    limit: 10,
    category: "e2e-category",
    order_by: "code",
    order_direction: "asc",
  } satisfies IShoppingMallAdminPermission.IRequest;

  const pageActiveOnly: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: requestWithoutDeleted,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(pageActiveOnly);

  const activeCodes = pageActiveOnly.data.map((p) => p.code);

  TestValidator.predicate(
    "non-deleted permission must appear when include_deleted is false",
    () => activeCodes.includes(perm1.code),
  );
  TestValidator.predicate(
    "deleted permission must not appear when include_deleted is false",
    () => activeCodes.includes(perm2.code) === false,
  );

  TestValidator.predicate(
    "active-only pagination metadata should be consistent",
    () =>
      pageActiveOnly.pagination.current >= 0 &&
      pageActiveOnly.pagination.limit >= 0 &&
      pageActiveOnly.pagination.records >= 0 &&
      pageActiveOnly.pagination.pages >= 0,
  );

  // 5. Search including deleted permissions
  const requestWithDeleted = {
    page: 1,
    limit: 10,
    category: "e2e-category",
    order_by: "code",
    order_direction: "asc",
    include_deleted: true,
  } satisfies IShoppingMallAdminPermission.IRequest;

  const pageWithDeleted: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: requestWithDeleted,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(pageWithDeleted);

  const allCodes = pageWithDeleted.data.map((p) => p.code);

  TestValidator.predicate(
    "active permission must appear when include_deleted is true",
    () => allCodes.includes(perm1.code),
  );
  TestValidator.predicate(
    "deleted permission must appear when include_deleted is true",
    () => allCodes.includes(perm2.code),
  );

  TestValidator.predicate(
    "pagination.records must be at least the number of observed permissions",
    () => pageWithDeleted.pagination.records >= 2,
  );

  // Relationship check between active-only and include_deleted views
  TestValidator.predicate(
    "records with include_deleted should be >= active-only records",
    () =>
      pageWithDeleted.pagination.records >= pageActiveOnly.pagination.records,
  );
}
