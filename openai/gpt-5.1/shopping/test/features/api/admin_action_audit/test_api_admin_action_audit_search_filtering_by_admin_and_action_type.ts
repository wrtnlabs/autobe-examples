import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallAdminActionAudit";
import type { IShoppingMallAdminActionAudit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminActionAudit";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate filtering of admin action audit search by administrator and action
 * type.
 *
 * Business goal: Ensure that the admin audit search endpoint only returns audit
 * summaries that match the requesting administrator and the specified action
 * types, so that a platform security operator can reliably investigate activity
 * by specific admins and operation classes.
 *
 * High‑level flow:
 *
 * 1. Register Platform Admin A with /auth/platformAdmin/join and obtain an
 *    authorized session.
 * 2. Register Platform Admin B with /auth/platformAdmin/join and obtain a distinct
 *    authorized session.
 * 3. While authenticated as Admin A, create one or more brands via
 *    /shoppingMall/platformAdmin/brands.
 * 4. While authenticated as Admin B, create one or more brands via
 *    /shoppingMall/platformAdmin/brands.
 *
 *    - We do not know the concrete action_type values but we know that these
 *         operations generate audit rows for each admin.
 * 5. Call PATCH /shoppingMall/platformAdmin/adminActionAudits with a body that
 *    filters by adminId = adminA.id and a reasonable page/limit.
 * 6. Inspect returned summaries and collect their action_type values; assert that
 *    every summary.platformadmin_id === adminA.id.
 * 7. Choose a subset of the observed action_type values (e.g., first one or two)
 *    and call the audits endpoint again with adminId = adminA.id and
 *    actionTypes = that subset, verifying that all returned rows still
 *    reference adminA.id and have action_type within the requested set.
 * 8. Repeat steps 5–7 for Admin B and assert isolation between admins.
 * 9. Optionally, use differing page/limit inputs to confirm that pagination
 *    metadata (current, limit, records, pages) is consistent with the size of
 *    the filtered result set.
 *
 * Important constraints:
 *
 * - We must never assume specific literal action_type values; instead, we read
 *   what the backend produced and then use those values to construct
 *   actionTypes filters.
 * - We rely on the SDK’s automatic Authorization header handling when switching
 *   admins by calling join for each one.
 */
export async function test_api_admin_action_audit_search_filtering_by_admin_and_action_type(
  connection: api.IConnection,
) {
  // 1. Register Platform Admin A
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin-a.example.com/join",
    referrer: "https://admin-a.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminA: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminA);

  const adminAId: string & tags.Format<"uuid"> = adminA.id;

  // 2. While logged in as Admin A, create brands to generate audit logs
  const adminABrandCount = 3;
  await ArrayUtil.asyncRepeat(adminABrandCount, async (index) => {
    const createBody = {
      name: `Admin A Brand ${index + 1}`,
      slug: `admin-a-brand-${RandomGenerator.alphaNumeric(8)}`,
      description: RandomGenerator.paragraph({ sentences: 5 }),
      logo_uri: "https://cdn.example.com/logo-admin-a.png",
    } satisfies IShoppingMallBrand.ICreate;

    const brand: IShoppingMallBrand =
      await api.functional.shoppingMall.platformAdmin.brands.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(brand);
  });

  // 3. Register Platform Admin B (new session and Authorization in same connection)
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin-b.example.com/join",
    referrer: "https://admin-b.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminB: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminB);

  const adminBId: string & tags.Format<"uuid"> = adminB.id;

  // 4. While logged in as Admin B, create brands to generate audit logs
  const adminBBrandCount = 2;
  await ArrayUtil.asyncRepeat(adminBBrandCount, async (index) => {
    const createBody = {
      name: `Admin B Brand ${index + 1}`,
      slug: `admin-b-brand-${RandomGenerator.alphaNumeric(8)}`,
      description: RandomGenerator.paragraph({ sentences: 4 }),
      logo_uri: "https://cdn.example.com/logo-admin-b.png",
    } satisfies IShoppingMallBrand.ICreate;

    const brand: IShoppingMallBrand =
      await api.functional.shoppingMall.platformAdmin.brands.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(brand);
  });

  // Helper to query audits for a given adminId and optional actionTypes
  const fetchAuditsForAdmin = async (
    adminId: string & tags.Format<"uuid">,
    actionTypes?: string[],
  ): Promise<IPageIShoppingMallAdminActionAudit.ISummary> => {
    const requestBody = {
      page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
      limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
      adminId,
      actionTypes,
    } satisfies IShoppingMallAdminActionAudit.IRequest;

    const page: IPageIShoppingMallAdminActionAudit.ISummary =
      await api.functional.shoppingMall.platformAdmin.adminActionAudits.index(
        connection,
        {
          body: requestBody,
        },
      );
    typia.assert(page);
    return page;
  };

  // 5. Query audits for Admin A without explicit actionTypes to discover values
  const pageAdminAAll: IPageIShoppingMallAdminActionAudit.ISummary =
    await fetchAuditsForAdmin(adminAId);

  const paginationAAll = pageAdminAAll.pagination;
  const dataAAll = pageAdminAAll.data;

  // Basic pagination metadata sanity check for Admin A
  TestValidator.predicate(
    "admin A pagination current page should be non-negative",
    paginationAAll.current >= 0,
  );
  TestValidator.predicate(
    "admin A pagination limit should be positive",
    paginationAAll.limit >= 0,
  );
  TestValidator.predicate(
    "admin A pagination records should be non-negative",
    paginationAAll.records >= 0,
  );
  TestValidator.predicate(
    "admin A pagination pages should be non-negative",
    paginationAAll.pages >= 0,
  );

  // If there are records, every summary must belong to Admin A
  await TestValidator.predicate(
    "all admin A audit records must have matching platformadmin_id",
    async () => {
      const mismatched = await ArrayUtil.asyncFilter(dataAAll, async (row) => {
        return row.platformadmin_id !== adminAId;
      });
      return mismatched.length === 0;
    },
  );

  // Collect distinct action_type values for Admin A
  const actionTypesASet = new Set<string>();
  for (const row of dataAAll) {
    actionTypesASet.add(row.action_type);
  }
  const actionTypesA = Array.from(actionTypesASet);

  // Derive a subset of Admin A action types (up to 2) for filtered query
  const filteredActionTypesA =
    actionTypesA.length <= 2 ? actionTypesA : actionTypesA.slice(0, 2);

  if (filteredActionTypesA.length > 0) {
    const pageAdminAFiltered: IPageIShoppingMallAdminActionAudit.ISummary =
      await fetchAuditsForAdmin(adminAId, filteredActionTypesA);

    const dataAFiltered = pageAdminAFiltered.data;
    const paginationAFiltered = pageAdminAFiltered.pagination;

    // All rows should still belong to Admin A and have action_type within filter
    await TestValidator.predicate(
      "filtered admin A audits must belong to Admin A and use only requested action types",
      async () => {
        const invalid = await ArrayUtil.asyncFilter(
          dataAFiltered,
          async (row) =>
            row.platformadmin_id !== adminAId ||
            filteredActionTypesA.indexOf(row.action_type) === -1,
        );
        return invalid.length === 0;
      },
    );

    // Pagination metadata consistency for filtered Admin A query
    TestValidator.predicate(
      "admin A filtered records count should be consistent with data length",
      paginationAFiltered.records >= dataAFiltered.length,
    );
  }

  // 6. Query audits for Admin B without explicit actionTypes
  const pageAdminBAll: IPageIShoppingMallAdminActionAudit.ISummary =
    await fetchAuditsForAdmin(adminBId);

  const paginationBAll = pageAdminBAll.pagination;
  const dataBAll = pageAdminBAll.data;

  TestValidator.predicate(
    "admin B pagination current page should be non-negative",
    paginationBAll.current >= 0,
  );
  TestValidator.predicate(
    "admin B pagination limit should be positive",
    paginationBAll.limit >= 0,
  );
  TestValidator.predicate(
    "admin B pagination records should be non-negative",
    paginationBAll.records >= 0,
  );
  TestValidator.predicate(
    "admin B pagination pages should be non-negative",
    paginationBAll.pages >= 0,
  );

  await TestValidator.predicate(
    "all admin B audit records must have matching platformadmin_id",
    async () => {
      const mismatched = await ArrayUtil.asyncFilter(dataBAll, async (row) => {
        return row.platformadmin_id !== adminBId;
      });
      return mismatched.length === 0;
    },
  );

  // Ensure that admin A audits do not appear in Admin B result set
  await TestValidator.predicate(
    "admin B audit records should not contain Admin A's id",
    async () => {
      const foundAdminA = await ArrayUtil.asyncFilter(
        dataBAll,
        async (row) => row.platformadmin_id === adminAId,
      );
      return foundAdminA.length === 0;
    },
  );

  const actionTypesBSet = new Set<string>();
  for (const row of dataBAll) {
    actionTypesBSet.add(row.action_type);
  }
  const actionTypesB = Array.from(actionTypesBSet);
  const filteredActionTypesB =
    actionTypesB.length <= 2 ? actionTypesB : actionTypesB.slice(0, 2);

  if (filteredActionTypesB.length > 0) {
    const pageAdminBFiltered: IPageIShoppingMallAdminActionAudit.ISummary =
      await fetchAuditsForAdmin(adminBId, filteredActionTypesB);

    const dataBFiltered = pageAdminBFiltered.data;
    const paginationBFiltered = pageAdminBFiltered.pagination;

    await TestValidator.predicate(
      "filtered admin B audits must belong to Admin B and use only requested action types",
      async () => {
        const invalid = await ArrayUtil.asyncFilter(
          dataBFiltered,
          async (row) =>
            row.platformadmin_id !== adminBId ||
            filteredActionTypesB.indexOf(row.action_type) === -1,
        );
        return invalid.length === 0;
      },
    );

    TestValidator.predicate(
      "admin B filtered records count should be consistent with data length",
      paginationBFiltered.records >= dataBFiltered.length,
    );
  }
}
