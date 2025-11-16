import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminRole";
import type { IShoppingMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminRole";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate includeDeleted flag behavior in platform admin role search.
 *
 * Business goal: Ensure that the admin role search endpoint for platform admins
 * correctly respects the `includeDeleted` filter when listing roles defined in
 * shopping_mall_admin_roles. When roles are soft-deleted via the erase endpoint
 * (which sets deleted_at), they must be hidden from normal search but can be
 * included when includeDeleted is true.
 *
 * Scenario steps:
 *
 * 1. Bootstrap a platform admin session using POST /auth/platformAdmin/join.
 *
 *    - This establishes the platformAdmin actor and issues authorization tokens used
 *         implicitly by the SDK.
 * 2. Create two distinct admin roles via POST
 *    /shoppingMall/platformAdmin/adminRoles.
 *
 *    - Use unique `code` values (e.g., generated via RandomGenerator/typia.random)
 *         and friendly names.
 *    - Assert the returned IShoppingMallAdminRole objects.
 * 3. Soft-delete one of the roles using DELETE
 *    /shoppingMall/platformAdmin/adminRoles/{adminRoleCode}.
 *
 *    - This should mark deleted_at on the corresponding row, but we do not directly
 *         read that column; we instead rely on search semantics.
 * 4. Call PATCH /shoppingMall/platformAdmin/adminRoles with a search request that
 *    does NOT set includeDeleted (or sets it to false) and that filters
 *    narrowly by one of the non-unique fields so both roles are candidates.
 *
 *    - Because IRequest.name is a substring search, we can share a name prefix or
 *         simply omit most filters and search by page/limit settings, relying
 *         on code filters for precision.
 *    - Validate that the response's data[] only contains non-deleted roles.
 *    - Specifically, verify that the non-deleted created role is present and the
 *         soft-deleted role is absent.
 *    - Use typia.assert on the IPageIShoppingMallAdminRole.ISummary result.
 * 5. Call PATCH /shoppingMall/platformAdmin/adminRoles again with the same filters
 *    but includeDeleted: true.
 *
 *    - Verify that the response can include both the active and soft-deleted roles.
 *    - Confirm that both role codes/names we created appear in data[].
 *    - Validate pagination metadata: records should be >= number of matched roles;
 *         when using a tight code filter, records should match the count of
 *         those roles.
 * 6. Use TestValidator assertions:
 *
 *    - TestValidator.predicate/equals for containment checks and counts.
 *    - Titles must clearly explain what is being validated.
 *
 * Implementation notes:
 *
 * - Use typia.random and RandomGenerator to generate safe, unique codes and names
 *   satisfying IShoppingMallAdminRole.ICreate constraints (code/name min
 *   length).
 * - Use IShoppingMallAdminRole.IRequest for search bodies, being careful with
 *   page/limit (1-based page index) versus IPage.IPagination (0-based
 *   current).
 * - Do not touch connection.headers directly other than what SDK already does.
 */
export async function test_api_admin_role_search_include_deleted_flag_behavior(
  connection: api.IConnection,
) {
  // 1. Join as a platform admin, issuing authorization token
  const joinRequest = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(2),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequest,
    });
  typia.assert(platformAdmin);

  // 2. Create two distinct admin roles
  const sharedNamePrefix = RandomGenerator.paragraph({ sentences: 1 });

  const roleCreateBody1 = {
    code: `${RandomGenerator.alphaNumeric(8)}_A`,
    name: `${sharedNamePrefix} role A`,
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const role1: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: roleCreateBody1 },
    );
  typia.assert(role1);

  const roleCreateBody2 = {
    code: `${RandomGenerator.alphaNumeric(8)}_B`,
    name: `${sharedNamePrefix} role B`,
    description_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies IShoppingMallAdminRole.ICreate;

  const role2: IShoppingMallAdminRole =
    await api.functional.shoppingMall.platformAdmin.adminRoles.create(
      connection,
      { body: roleCreateBody2 },
    );
  typia.assert(role2);

  // 3. Soft-delete one of the roles (role2) via erase by code
  await api.functional.shoppingMall.platformAdmin.adminRoles.erase(connection, {
    adminRoleCode: role2.code,
  });

  // Helper to search by code list using multiple calls; since IRequest has
  // a single code filter, we search individually per code.

  // 4. Search without includeDeleted (default behavior)
  const searchActiveByRole1 =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
          code: role1.code,
          // includeDeleted omitted => should behave as false
        } satisfies IShoppingMallAdminRole.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(searchActiveByRole1);

  const activeCodesForRole1 = searchActiveByRole1.data.map((s) => s.code);

  TestValidator.predicate(
    "non-deleted role1 must appear when includeDeleted is false/omitted",
    () => activeCodesForRole1.includes(role1.code),
  );

  const searchActiveByRole2 =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
          code: role2.code,
        } satisfies IShoppingMallAdminRole.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(searchActiveByRole2);

  const activeCodesForRole2 = searchActiveByRole2.data.map((s) => s.code);

  TestValidator.predicate(
    "soft-deleted role2 must NOT appear when includeDeleted is false/omitted",
    () => activeCodesForRole2.includes(role2.code) === false,
  );

  // 5. Search with includeDeleted: true
  const searchWithDeletedRole1 =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
          code: role1.code,
          includeDeleted: true,
        } satisfies IShoppingMallAdminRole.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(searchWithDeletedRole1);

  const searchWithDeletedRole2 =
    await api.functional.shoppingMall.platformAdmin.adminRoles.index(
      connection,
      {
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 20 as number & tags.Type<"int32"> & tags.Minimum<1>,
          code: role2.code,
          includeDeleted: true,
        } satisfies IShoppingMallAdminRole.IRequest,
      },
    );
  typia.assert<IPageIShoppingMallAdminRole.ISummary>(searchWithDeletedRole2);

  const codesWithDeletedRole1 = searchWithDeletedRole1.data.map((s) => s.code);
  const codesWithDeletedRole2 = searchWithDeletedRole2.data.map((s) => s.code);

  TestValidator.predicate(
    "role1 should still appear when includeDeleted is true",
    () => codesWithDeletedRole1.includes(role1.code),
  );

  TestValidator.predicate(
    "soft-deleted role2 should be searchable when includeDeleted is true",
    () => codesWithDeletedRole2.includes(role2.code),
  );

  // 6. Validate pagination metadata for these filtered calls
  const expectedRole1Count = codesWithDeletedRole1.includes(role1.code) ? 1 : 0;
  const expectedRole2Count = codesWithDeletedRole2.includes(role2.code) ? 1 : 0;

  TestValidator.predicate(
    "pagination.records for role1 code search must be >= matched count",
    () => searchWithDeletedRole1.pagination.records >= expectedRole1Count,
  );

  TestValidator.predicate(
    "pagination.records for role2 code search must be >= matched count",
    () => searchWithDeletedRole2.pagination.records >= expectedRole2Count,
  );
}
