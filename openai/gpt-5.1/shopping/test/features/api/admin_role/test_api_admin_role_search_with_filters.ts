import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRole";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";

/**
 * Validate admin role search and filtering via PATCH
 * /shoppingMall/admin/adminRoles.
 *
 * Business goals:
 *
 * - Ensure that an authenticated admin can search roles with precise filters.
 * - Verify that filtering by exact code and is_system works.
 * - Verify that free-text search by name behaves as expected when is_system is
 *   not constrained.
 * - Verify that created_from/created_to range can isolate a role by creation
 *   time.
 * - Verify that combining filters like name and is_system further narrows the
 *   result set.
 *
 * Steps:
 *
 * 1. Join an admin via POST /auth/admin/join to obtain an authorized admin
 *    context.
 * 2. Create a system role with a distinct code, plus multiple non-system roles
 *    with different names/codes.
 * 3. Query PATCH /shoppingMall/admin/adminRoles with
 *    IShoppingMallAdminRole.IRequest using code + is_system.
 * 4. Query again with search set to a substring of a non-system role's name while
 *    is_system is null.
 * 5. Build a tight created_from/created_to window around one role's created_at
 *    value and filter by that range.
 * 6. Combine name and is_system filters to ensure only matching roles are
 *    returned.
 */
export async function test_api_admin_role_search_with_filters(
  connection: api.IConnection,
) {
  // 1. Authenticate as an admin using join endpoint.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const admin = await api.functional.auth.admin.join(connection, {
    body: joinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(admin);

  // 2. Create roles: one system role, and two non-system roles.
  const systemCode = "super_admin_" + RandomGenerator.alphaNumeric(8);
  const systemRole = await api.functional.shoppingMall.admin.adminRoles.create(
    connection,
    {
      body: {
        code: systemCode,
        name: "Super Administrator",
        description: RandomGenerator.paragraph({ sentences: 4 }),
        is_system: true,
      } satisfies IShoppingMallAdminRole.ICreate,
    },
  );
  typia.assert<IShoppingMallAdminRole>(systemRole);

  const nonSystemCode1 = "ops_admin_" + RandomGenerator.alphaNumeric(8);
  const nonSystemRole1 =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: {
        code: nonSystemCode1,
        name: "Operations Manager",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_system: false,
      } satisfies IShoppingMallAdminRole.ICreate,
    });
  typia.assert<IShoppingMallAdminRole>(nonSystemRole1);

  const nonSystemCode2 = "review_admin_" + RandomGenerator.alphaNumeric(8);
  const nonSystemRole2 =
    await api.functional.shoppingMall.admin.adminRoles.create(connection, {
      body: {
        code: nonSystemCode2,
        name: "Risk Reviewer",
        description: RandomGenerator.paragraph({ sentences: 3 }),
        is_system: false,
      } satisfies IShoppingMallAdminRole.ICreate,
    });
  typia.assert<IShoppingMallAdminRole>(nonSystemRole2);

  // 3. Filter by exact code and is_system = true; expect exactly the system role.
  const pageByCodeAndSystem =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: null,
        code: systemCode,
        name: null,
        is_system: true,
        created_from: null,
        created_to: null,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies IShoppingMallAdminRole.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(pageByCodeAndSystem);

  TestValidator.equals(
    "filter by code and is_system should return exactly one role",
    pageByCodeAndSystem.pagination.records,
    1 as number,
  );
  TestValidator.equals(
    "returned role code matches system role code",
    pageByCodeAndSystem.data[0]?.code ?? "",
    systemCode,
  );
  TestValidator.equals(
    "returned role is marked as system",
    pageByCodeAndSystem.data[0]?.isSystem ?? false,
    true,
  );

  // 4. Free-text search by name fragment, is_system left null.
  const searchFragment = nonSystemRole1.name.slice(0, 5);
  const pageBySearchName =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: searchFragment,
        code: null,
        name: null,
        is_system: null,
        created_from: null,
        created_to: null,
        order_by: "code",
        order_direction: "asc",
      } satisfies IShoppingMallAdminRole.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(pageBySearchName);

  const hasNonSystemRole1InSearch = pageBySearchName.data.some((role) => {
    return role.id === nonSystemRole1.id;
  });
  TestValidator.predicate(
    "search by fragment of non-system role name should include that role",
    hasNonSystemRole1InSearch,
  );

  // 5. Filter using a creation time window around nonSystemRole2.created_at.
  const centerCreatedAt = nonSystemRole2.created_at;
  const centerDate = new Date(centerCreatedAt);
  const fromDate = new Date(centerDate.getTime() - 5 * 60 * 1000);
  const toDate = new Date(centerDate.getTime() + 5 * 60 * 1000);

  const pageByCreatedRange =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: null,
        code: null,
        name: null,
        is_system: null,
        created_from: fromDate.toISOString() as string &
          tags.Format<"date-time">,
        created_to: toDate.toISOString() as string & tags.Format<"date-time">,
        order_by: "created_at",
        order_direction: "asc",
      } satisfies IShoppingMallAdminRole.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(pageByCreatedRange);

  const onlyRolesInWindow = pageByCreatedRange.data.every((summary) => {
    const created = new Date(summary.createdAt).getTime();
    return created >= fromDate.getTime() && created <= toDate.getTime();
  });
  TestValidator.predicate(
    "all returned roles must have createdAt within specified window",
    onlyRolesInWindow,
  );

  const hasNonSystemRole2InWindow = pageByCreatedRange.data.some((summary) => {
    return summary.id === nonSystemRole2.id;
  });
  TestValidator.predicate(
    "windowed filter should include targeted non-system role 2",
    hasNonSystemRole2InWindow,
  );

  // 6. Combine name and is_system filters for a narrow result set.
  const combinedFilterPage =
    await api.functional.shoppingMall.admin.adminRoles.index(connection, {
      body: {
        page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
        search: null,
        code: null,
        name: nonSystemRole1.name,
        is_system: false,
        created_from: null,
        created_to: null,
        order_by: "created_at",
        order_direction: "desc",
      } satisfies IShoppingMallAdminRole.IRequest,
    });
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(combinedFilterPage);

  const onlyNonSystemMatchingName = combinedFilterPage.data.every((summary) => {
    return summary.name === nonSystemRole1.name && summary.isSystem === false;
  });
  TestValidator.predicate(
    "combined name and is_system filters must only return non-system roles with that exact name",
    onlyNonSystemMatchingName,
  );

  const hasExpectedRole = combinedFilterPage.data.some((summary) => {
    return summary.id === nonSystemRole1.id;
  });
  TestValidator.predicate(
    "combined filters result set must contain the expected non-system role 1",
    hasExpectedRole,
  );
}
