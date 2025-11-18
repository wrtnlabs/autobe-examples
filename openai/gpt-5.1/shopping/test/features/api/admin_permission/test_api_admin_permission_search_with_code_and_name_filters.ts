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
 * Validate admin permission search by code and name filters.
 *
 * Business goal: ensure that an authenticated admin can search the RBAC
 * permission catalog using partial `code` and `name` filters and receive
 * correctly filtered, paginated results that include accurate summary metadata
 * such as `is_system` and `category`.
 *
 * Scenario:
 *
 * 1. Join an admin account via POST /auth/admin/join
 *
 *    - Use IShoppingMallAdminJoin.ICreate as request body
 *    - Expect IShoppingMallAdmin.IAuthorized as response and rely on the SDK to
 *         install Authorization header for subsequent calls.
 * 2. Using the authenticated admin context, create three permissions via POST
 *    /shoppingMall/admin/adminPermissions:
 *
 *    - Permission A: code "orders.manage", name "Manage Orders", category "orders",
 *         is_system=false
 *    - Permission B: code "orders.view", name "View Orders", category "orders",
 *         is_system=false
 *    - Permission C: code "users.manage", name "Manage Users", category "users",
 *         is_system=false (unrelated to orders) All three use
 *         IShoppingMallAdminPermission.ICreate. Capture their returned entities
 *         so we have their IDs and fields for later comparison.
 * 3. Call PATCH /shoppingMall/admin/adminPermissions via
 *    api.functional.shoppingMall.admin.adminPermissions.index with
 *    IShoppingMallAdminPermission.IRequest body:
 *
 *    - Page: 1
 *    - Limit: 10
 *    - Code: "orders" (to exercise prefix/partial matching semantics as allowed by
 *         docs)
 *    - Name: "Orders" (to exercise substring matching for names) Leave other filters
 *         undefined.
 * 4. Assert the response shape using
 *    typia.assert<IPageIShoppingMallAdminPermission.ISummary>(output).
 * 5. Check pagination metadata:
 *
 *    - Pagination.current === 1
 *    - Pagination.limit === 10
 *    - Pagination.records === 2
 *    - Pagination.pages === 1 (because 2 records with limit 10 yields 1 page)
 * 6. Validate that the returned data array has length 2 and contains summary items
 *    for exactly the two "orders.*" permissions created earlier:
 *
 *    - Collect the set of returned codes and assert that it equals {"orders.manage",
 *         "orders.view"}.
 *    - Ensure no item with code "users.manage" is present.
 * 7. For each returned summary item, validate that key business fields match those
 *    from the created permissions:
 *
 *    - Code and name must match exactly
 *    - Category must be "orders"
 *    - Is_system must be false
 *    - Created_at and updated_at are valid date-time strings (by relying on
 *         typia.assert having already validated them)
 * 8. Do not test any type error scenarios or intentionally invalid payloads; stay
 *    within valid DTO contracts only.
 */
export async function test_api_admin_permission_search_with_code_and_name_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin via join endpoint
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Create three admin permissions under authenticated admin context
  const permCreateA = {
    code: "orders.manage",
    name: "Manage Orders",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: "orders",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const permCreateB = {
    code: "orders.view",
    name: "View Orders",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: "orders",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const permCreateC = {
    code: "users.manage",
    name: "Manage Users",
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category: "users",
    is_system: false,
  } satisfies IShoppingMallAdminPermission.ICreate;

  const createdA =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      { body: permCreateA },
    );
  typia.assert<IShoppingMallAdminPermission>(createdA);

  const createdB =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      { body: permCreateB },
    );
  typia.assert<IShoppingMallAdminPermission>(createdB);

  const createdC =
    await api.functional.shoppingMall.admin.adminPermissions.create(
      connection,
      { body: permCreateC },
    );
  typia.assert<IShoppingMallAdminPermission>(createdC);

  // 3. Search with code and name filters for "orders" and "Orders"
  const requestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    code: "orders",
    name: "Orders",
  } satisfies IShoppingMallAdminPermission.IRequest;

  const pageResult =
    await api.functional.shoppingMall.admin.adminPermissions.index(connection, {
      body: requestBody,
    });
  typia.assert<IPageIShoppingMallAdminPermission.ISummary>(pageResult);

  const { pagination, data } = pageResult;

  // 5. Assert pagination metadata
  TestValidator.equals("pagination current page", 1, pagination.current);
  TestValidator.equals("pagination limit", 10, pagination.limit);
  TestValidator.equals("pagination records", 2, pagination.records);
  TestValidator.equals("pagination pages", 1, pagination.pages);

  // 6. Validate that exactly the two orders.* permissions are returned
  TestValidator.equals("data length is 2", data.length, 2);

  const codes = data.map((item) => item.code).sort();
  const expectedCodes = ["orders.manage", "orders.view"].sort();
  TestValidator.equals("returned codes match expected", codes, expectedCodes);

  const hasUsersManage = data.some((item) => item.code === "users.manage");
  TestValidator.predicate(
    "unrelated users.manage permission is not included",
    hasUsersManage === false,
  );

  // 7. Validate each returned summary item fields
  for (const summary of data) {
    const source = summary.code === createdA.code ? createdA : createdB;

    TestValidator.equals(
      "summary code matches created permission",
      summary.code,
      source.code,
    );
    TestValidator.equals(
      "summary name matches created permission",
      summary.name,
      source.name,
    );
    TestValidator.equals(
      "summary category matches created permission",
      summary.category,
      source.category ?? null,
    );
    TestValidator.equals(
      "summary is_system matches created permission",
      summary.is_system,
      source.is_system,
    );
  }
}
