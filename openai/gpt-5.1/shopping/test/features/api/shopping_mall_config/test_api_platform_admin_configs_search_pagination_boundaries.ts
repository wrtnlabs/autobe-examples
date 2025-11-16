import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallConfig";
import type { IShoppingMallConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallConfig";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

/**
 * Validate pagination boundary behavior for platform admin configuration
 * search.
 *
 * Business goal: Ensure that PATCH /shoppingMall/platformAdmin/configs
 * correctly applies 1-based request paging (IShoppingMallConfig.IRequest.page)
 * into the zero-based IPage.IPagination.current field and returns consistent
 * pagination metadata and data slices, even when total records exceed a single
 * page.
 *
 * Scenario overview:
 *
 * 1. Bootstrap an authorized platform admin session.
 * 2. Seed more configs than a single page with deterministic keys.
 * 3. Query the second logical page to verify page 1 (1-based) -> current=1
 *    (0-based).
 * 4. Query the last page and verify remaining records and non-duplication.
 * 5. Optionally check out-of-range page behavior.
 */
export async function test_api_platform_admin_configs_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Join as platform admin (authentication bootstrap)
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Seed deterministic configuration entries
  const testNamespacePrefix = `e2e.pagination.test.${RandomGenerator.alphaNumeric(8)}`;
  const totalConfigsToCreate = 15;

  const createdConfigs: IShoppingMallConfig[] = await ArrayUtil.asyncRepeat(
    totalConfigsToCreate,
    async (index) => {
      const seq = index + 1;
      const key = `config_${seq.toString().padStart(2, "0")}`;

      const createBody = {
        namespace: `${testNamespacePrefix}.namespace`,
        key,
        value: `value_${seq}`,
        description: `Pagination test config ${seq}`,
        active: true,
      } satisfies IShoppingMallConfig.ICreate;

      const created =
        await api.functional.shoppingMall.platformAdmin.configs.create(
          connection,
          { body: createBody },
        );
      typia.assert(created);
      return created;
    },
  );

  // Sort created configs by key ascending to define deterministic expected order
  const sortedByKey = [...createdConfigs].sort((a, b) =>
    a.key.localeCompare(b.key),
  );

  const pageSize = 10;

  // 3. Query page=1 (1-based), expect second logical page (current=1 zero-based)
  const secondPageRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    keyPrefix: undefined,
    category: undefined,
    isActive: null,
    orderBy: "key",
    orderDirection: "asc" as const,
  } satisfies IShoppingMallConfig.IRequest;

  const secondPage: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: secondPageRequestBody,
    });
  typia.assert(secondPage);

  const secondPagination = secondPage.pagination;
  typia.assert(secondPagination);

  // Pagination metadata checks: verify 1-based -> 0-based mapping and basic invariants
  TestValidator.equals(
    "second page current index should equal requested page-1 (zero-based)",
    secondPagination.current,
    secondPageRequestBody.page - 1,
  );
  TestValidator.equals(
    "page size limit should equal requested limit",
    secondPagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "records should be at least the number of created configs",
    secondPagination.records >= createdConfigs.length,
  );
  TestValidator.predicate(
    "pages should be at least 2 when records exceed page size",
    secondPagination.pages >= 2,
  );

  // Filter returned data down to this test's namespace
  const secondPageDataForNamespace = secondPage.data.filter(
    (item) => item.namespace === `${testNamespacePrefix}.namespace`,
  );

  // Ensure we have at most pageSize items for this namespace
  TestValidator.predicate(
    "second page namespace-specific data length should be <= page size",
    secondPageDataForNamespace.length <= pageSize,
  );

  // 4. Query last page based on total pages, using 1-based page number
  const lastPageOneBased =
    secondPagination.pages > 0 ? secondPagination.pages : 1;

  const lastPageRequestBody = {
    page: lastPageOneBased as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    keyPrefix: undefined,
    category: undefined,
    isActive: null,
    orderBy: "key",
    orderDirection: "asc" as const,
  } satisfies IShoppingMallConfig.IRequest;

  const lastPage: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: lastPageRequestBody,
    });
  typia.assert(lastPage);

  const lastPagination = lastPage.pagination;
  typia.assert(lastPagination);

  TestValidator.equals(
    "last page current index should equal pages - 1",
    lastPagination.current,
    lastPagination.pages > 0 ? lastPagination.pages - 1 : 0,
  );

  const lastPageDataForNamespace = lastPage.data.filter(
    (item) => item.namespace === `${testNamespacePrefix}.namespace`,
  );

  // Collect IDs from second and last page for this namespace
  const secondIds = secondPageDataForNamespace.map((i) => i.id);
  const lastIds = lastPageDataForNamespace.map((i) => i.id);

  // Ensure no duplication between second and last page slices
  const duplicateIds = secondIds.filter((id) => lastIds.includes(id));
  TestValidator.equals(
    "no duplicated config IDs between second and last page for this namespace",
    duplicateIds.length,
    0,
  );

  // 5. Re-fetch with a large limit to aggregate all configs and verify coverage
  const allPagesRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    keyPrefix: undefined,
    category: undefined,
    isActive: null,
    orderBy: "key",
    orderDirection: "asc" as const,
  } satisfies IShoppingMallConfig.IRequest;

  const allPage: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: allPagesRequestBody,
    });
  typia.assert(allPage);

  const allNamespaceData = allPage.data.filter(
    (item) => item.namespace === `${testNamespacePrefix}.namespace`,
  );

  // We expect at least the number of created configs for this namespace
  TestValidator.predicate(
    "all-rows fetch should contain at least created configs for this namespace",
    allNamespaceData.length >= createdConfigs.length,
  );

  // Ensure every created config ID exists in allNamespaceData
  const allNamespaceIds = allNamespaceData.map((i) => i.id);
  await ArrayUtil.asyncForEach(sortedByKey, async (created) => {
    TestValidator.predicate(
      `created config ${created.key} should be present in aggregated data`,
      allNamespaceIds.includes(created.id),
    );
  });

  // 6. Out-of-range page test: request a page far beyond total pages
  const outOfRangePage = lastPagination.pages + 10;
  const outOfRangeRequestBody = {
    page: outOfRangePage as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: pageSize as number & tags.Type<"int32"> & tags.Minimum<1>,
    search: undefined,
    keyPrefix: undefined,
    category: undefined,
    isActive: null,
    orderBy: "key",
    orderDirection: "asc" as const,
  } satisfies IShoppingMallConfig.IRequest;

  const outOfRange: IPageIShoppingMallConfig.ISummary =
    await api.functional.shoppingMall.platformAdmin.configs.index(connection, {
      body: outOfRangeRequestBody,
    });
  typia.assert(outOfRange);

  const outOfRangeNamespaceData = outOfRange.data.filter(
    (item) => item.namespace === `${testNamespacePrefix}.namespace`,
  );

  // Ensure out-of-range behavior does not overshoot this test's created records
  TestValidator.predicate(
    "out-of-range page data for namespace should not exceed created count",
    outOfRangeNamespaceData.length <= createdConfigs.length,
  );

  TestValidator.predicate(
    "out-of-range pagination records should be >= created count",
    outOfRange.pagination.records >= createdConfigs.length,
  );
}
