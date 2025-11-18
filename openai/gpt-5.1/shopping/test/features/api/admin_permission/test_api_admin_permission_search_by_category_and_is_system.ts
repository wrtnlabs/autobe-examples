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
 * Validate that category and is_system filters correctly partition the admin
 * permission catalog.
 *
 * Business goal:
 *
 * - Ensure that PATCH /shoppingMall/admin/adminPermissions can filter permissions
 *   by category and is_system, returning only the matching records with correct
 *   pagination metadata.
 *
 * High level steps:
 *
 * 1. Join as an admin to obtain Authorization context.
 * 2. Create four permissions with combinations of category ("orders"/"users") and
 *    is_system (true/false).
 * 3. Search with category="orders" and is_system=true and verify only the matching
 *    permission is returned and pagination reflects a single record.
 * 4. Search with category="users" and is_system=false and verify only the matching
 *    permission is returned and pagination reflects a single record.
 */
export async function test_api_admin_permission_search_by_category_and_is_system(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<
      (string & tags.Format<"ipv4">) | (string & tags.Format<"ipv6">)
    >(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed four permissions with controlled categories and is_system flags
  const baseCodePrefix = RandomGenerator.alphaNumeric(8);

  const permOrdersSystem: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: {
          code: `${baseCodePrefix}.orders.system`,
          name: "Orders System Permission",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category: "orders",
          is_system: true,
        } satisfies IShoppingMallAdminPermission.ICreate,
      },
    );
  typia.assert(permOrdersSystem);

  const permOrdersCustom: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: {
          code: `${baseCodePrefix}.orders.custom`,
          name: "Orders Custom Permission",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category: "orders",
          is_system: false,
        } satisfies IShoppingMallAdminPermission.ICreate,
      },
    );
  typia.assert(permOrdersCustom);

  const permUsersSystem: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: {
          code: `${baseCodePrefix}.users.system`,
          name: "Users System Permission",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category: "users",
          is_system: true,
        } satisfies IShoppingMallAdminPermission.ICreate,
      },
    );
  typia.assert(permUsersSystem);

  const permUsersCustom: IShoppingMallAdminPermission =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      {
        body: {
          code: `${baseCodePrefix}.users.custom`,
          name: "Users Custom Permission",
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category: "users",
          is_system: false,
        } satisfies IShoppingMallAdminPermission.ICreate,
      },
    );
  typia.assert(permUsersCustom);

  // 3. Search: category="orders", is_system=true
  const searchOrdersSystemBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    category: "orders",
    is_system: true,
  } satisfies IShoppingMallAdminPermission.IRequest;

  const ordersSystemPage: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: searchOrdersSystemBody,
    });
  typia.assert(ordersSystemPage);

  // Assertions for orders/system filter
  TestValidator.equals(
    "orders/system filter returns exactly one record",
    ordersSystemPage.data.length,
    1,
  );

  const ordersSystemSummary = ordersSystemPage.data[0];
  TestValidator.equals(
    "orders/system summary id matches created permission",
    ordersSystemSummary.id,
    permOrdersSystem.id,
  );
  TestValidator.equals(
    "orders/system summary code matches created permission",
    ordersSystemSummary.code,
    permOrdersSystem.code,
  );
  TestValidator.equals(
    "orders/system summary category is 'orders'",
    ordersSystemSummary.category,
    "orders",
  );
  TestValidator.equals(
    "orders/system summary is_system is true",
    ordersSystemSummary.is_system,
    true,
  );

  TestValidator.equals(
    "orders/system pagination.records equals data length",
    ordersSystemPage.pagination.records,
    ordersSystemPage.data.length,
  );
  TestValidator.equals(
    "orders/system pagination.current equals requested page",
    ordersSystemPage.pagination.current,
    searchOrdersSystemBody.page,
  );
  TestValidator.equals(
    "orders/system pagination.limit equals requested limit",
    ordersSystemPage.pagination.limit,
    searchOrdersSystemBody.limit,
  );

  // 4. Search: category="users", is_system=false
  const searchUsersCustomBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    category: "users",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.IRequest;

  const usersCustomPage: IPageIShoppingMallAdminPermission.ISummary =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: searchUsersCustomBody,
    });
  typia.assert(usersCustomPage);

  // Assertions for users/custom filter
  TestValidator.equals(
    "users/custom filter returns exactly one record",
    usersCustomPage.data.length,
    1,
  );

  const usersCustomSummary = usersCustomPage.data[0];
  TestValidator.equals(
    "users/custom summary id matches created permission",
    usersCustomSummary.id,
    permUsersCustom.id,
  );
  TestValidator.equals(
    "users/custom summary code matches created permission",
    usersCustomSummary.code,
    permUsersCustom.code,
  );
  TestValidator.equals(
    "users/custom summary category is 'users'",
    usersCustomSummary.category,
    "users",
  );
  TestValidator.equals(
    "users/custom summary is_system is false",
    usersCustomSummary.is_system,
    false,
  );

  TestValidator.equals(
    "users/custom pagination.records equals data length",
    usersCustomPage.pagination.records,
    usersCustomPage.data.length,
  );
  TestValidator.equals(
    "users/custom pagination.current equals requested page",
    usersCustomPage.pagination.current,
    searchUsersCustomBody.page,
  );
  TestValidator.equals(
    "users/custom pagination.limit equals requested limit",
    usersCustomPage.pagination.limit,
    searchUsersCustomBody.limit,
  );
}
