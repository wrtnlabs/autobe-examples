import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskFlag";
import type { IShoppingMallAuthCredentials } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentials";
import type { IShoppingMallAuthCredentialsActor } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthCredentialsActor";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallRiskFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskFlag";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Validate pagination boundaries when searching platform-admin risk flags for a
 * specific auth credential.
 *
 * Business intent
 *
 * - Ensure that PATCH
 *   /shoppingMall/platformAdmin/authCredentials/{authCredentialsId}/riskFlags
 *   (search index) correctly handles:
 *
 *   - First page (default when page is omitted, 1-based request → 0-based current
 *       in IPage.IPagination).
 *   - Last page derived from pagination.pages.
 *   - Out-of-range pages beyond the last page.
 * - Validate that pagination metadata and page slices are self-consistent and
 *   allow reconstruction of the full list of risk flag summaries without
 *   duplicates.
 *
 * End-to-end steps
 *
 * 1. Join as a platform admin using POST /auth/platformAdmin/join to obtain an
 *    authorized session.
 * 2. Choose a dedicated authCredentialsId (random UUID for test isolation).
 * 3. Create N (>= 25) risk flags for that authCredentialsId using POST
 *    .../riskFlags.
 * 4. Call PATCH .../riskFlags with limit=10 and no page (first-page default) and
 *    validate:
 *
 *    - Pagination.limit === 10.
 *    - Pagination.current === 0 (0-based index).
 *    - Pagination.records >= N.
 *    - Pagination.pages === Math.ceil(records / limit) when records > 0, or 0 when
 *         records === 0.
 *    - Data.length > 0 && data.length <= limit.
 * 5. Compute lastPageIndex = pagination.pages - 1 when pages > 0.
 *
 *    - Call PATCH .../riskFlags again with page = lastPageIndex + 1 (1-based
 *         request) and same limit.
 *    - Validate pagination.current === lastPageIndex and 0 < data.length <= limit.
 * 6. Request page = pagination.pages + 1 (out-of-range) and validate one of:
 *
 *    - Successful response with typia.assert, stable pagination.records/pages, and
 *         data.length === 0, with pagination.current clamped to a sensible
 *         value (implementation-defined), OR
 *    - A business error (4xx) that can be detected using TestValidator.error
 *         (without checking status codes).
 * 7. Reconstruct the full ordered set by iterating pages 1..pages (when pages >
 *    0), aggregating data, and validate using TestValidator that:
 *
 *    - Aggregated.length === pagination.records from the first call,
 *    - There are no duplicate risk flag ids across all pages.
 */
export async function test_api_platform_admin_risk_flag_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized session and token handling.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: RandomGenerator.mobile(),
    href: "https://admin.shoppingmall.test/join",
    referrer: "https://shoppingmall.test/landing/platform-admin",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Pick a dedicated authCredentialsId for this test.
  const authCredentialsId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Create many risk flags for this credential (e.g., 25).
  const flagCount = 25;
  const createdFlags: IShoppingMallRiskFlag[] = await ArrayUtil.asyncRepeat(
    flagCount,
    async (index) => {
      const body = {
        code: `test_code_${index}`,
        reasonCategory: index % 2 === 0 ? "suspected_fraud" : "abuse_reports",
        riskLevel:
          index % 3 === 0 ? "high" : index % 3 === 1 ? "medium" : "low",
        message: RandomGenerator.paragraph({ sentences: 4 }),
        active: index % 5 !== 0,
        expiresAt:
          index % 4 === 0
            ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            : null,
        notes:
          index % 3 === 0 ? RandomGenerator.paragraph({ sentences: 2 }) : null,
      } satisfies IShoppingMallRiskFlag.ICreate;

      const created =
        await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.create(
          connection,
          {
            authCredentialsId,
            body,
          },
        );
      typia.assert(created);
      return created;
    },
  );

  TestValidator.equals(
    "created flag count matches requested",
    createdFlags.length,
    flagCount,
  );

  // 4. First page: limit=10, omit page (should default to first page).
  const limit = 10 as number & tags.Type<"int32"> & tags.Minimum<1>;
  const firstPageRequest = {
    limit,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IShoppingMallRiskFlag.IRequest;

  const firstPage =
    await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.index(
      connection,
      {
        authCredentialsId,
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);

  const pagination = firstPage.pagination;
  const firstPageData = firstPage.data;

  // Basic invariants for first page.
  TestValidator.equals("first page limit", pagination.limit, limit);
  TestValidator.equals(
    "first page current index is 0-based",
    pagination.current,
    0,
  );
  TestValidator.predicate(
    "records should be at least number of created flags",
    pagination.records >= createdFlags.length,
  );
  TestValidator.predicate(
    "pages computed from records and limit",
    pagination.records === 0
      ? pagination.pages === 0
      : pagination.pages ===
          Math.ceil(pagination.records / Math.max(pagination.limit, 1)),
  );
  TestValidator.predicate(
    "first page data length between 1 and limit",
    firstPageData.length > 0 && firstPageData.length <= pagination.limit,
  );

  // 5. Last page request when pages > 0.
  const pages = pagination.pages;
  if (pages > 0) {
    const lastPageIndex = pages - 1;
    const lastPageRequest = {
      page: (lastPageIndex + 1) as number &
        tags.Type<"int32"> &
        tags.Minimum<1>,
      limit,
      orderBy: "created_at",
      orderDirection: "desc",
    } satisfies IShoppingMallRiskFlag.IRequest;

    const lastPage =
      await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.index(
        connection,
        {
          authCredentialsId,
          body: lastPageRequest,
        },
      );
    typia.assert(lastPage);

    const lastPagination = lastPage.pagination;
    const lastData = lastPage.data;

    TestValidator.equals(
      "last page current index",
      lastPagination.current,
      lastPageIndex,
    );
    TestValidator.equals(
      "last page records stable",
      lastPagination.records,
      pagination.records,
    );
    TestValidator.equals(
      "last page pages stable",
      lastPagination.pages,
      pagination.pages,
    );
    TestValidator.predicate(
      "last page data length between 1 and limit",
      lastData.length > 0 && lastData.length <= lastPagination.limit,
    );

    // 6. Out-of-range page: request page = pages + 1.
    const outOfRangePageNumber = (pages + 1) as number &
      tags.Type<"int32"> &
      tags.Minimum<1>;

    const outOfRangeRequest = {
      page: outOfRangePageNumber,
      limit,
      orderBy: "created_at",
      orderDirection: "desc",
    } satisfies IShoppingMallRiskFlag.IRequest;

    // Expect either a normal empty-page response or a business error.
    let outOfRangeResponse: IPageIShoppingMallRiskFlag.ISummary | null = null;
    let didError = false;
    try {
      const res =
        await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.index(
          connection,
          {
            authCredentialsId,
            body: outOfRangeRequest,
          },
        );
      typia.assert(res);
      outOfRangeResponse = res;
    } catch {
      didError = true;
    }

    if (didError === false && outOfRangeResponse !== null) {
      const outPage = outOfRangeResponse.pagination;
      const outData = outOfRangeResponse.data;

      TestValidator.equals(
        "out-of-range records stable",
        outPage.records,
        pagination.records,
      );
      TestValidator.equals(
        "out-of-range pages stable",
        outPage.pages,
        pagination.pages,
      );
      TestValidator.predicate(
        "out-of-range data is empty or within limit",
        outData.length <= outPage.limit,
      );
    }

    // 7. Reconstruct all pages and check there are no duplicates and counts match.
    const aggregated: IShoppingMallRiskFlag.ISummary[] = [];
    for (let pageIndex = 0; pageIndex < pages; pageIndex++) {
      const pageRequest = {
        page: (pageIndex + 1) as number & tags.Type<"int32"> & tags.Minimum<1>,
        limit,
        orderBy: "created_at",
        orderDirection: "desc",
      } satisfies IShoppingMallRiskFlag.IRequest;

      const pageResult =
        await api.functional.shoppingMall.platformAdmin.authCredentials.riskFlags.index(
          connection,
          {
            authCredentialsId,
            body: pageRequest,
          },
        );
      typia.assert(pageResult);

      TestValidator.equals(
        `page ${pageIndex} current index matches`,
        pageResult.pagination.current,
        pageIndex,
      );

      const slice = pageResult.data;
      if (pageIndex < pages - 1) {
        TestValidator.predicate(
          `page ${pageIndex} slice non-empty and within limit`,
          slice.length > 0 && slice.length <= pageResult.pagination.limit,
        );
      } else {
        TestValidator.predicate(
          `last aggregated page slice within limit`,
          slice.length <= pageResult.pagination.limit,
        );
      }

      for (const item of slice) aggregated.push(item);
    }

    TestValidator.equals(
      "aggregated count matches records",
      aggregated.length,
      pagination.records,
    );

    // Ensure there are no duplicate ids in aggregated list.
    const seen = new Set<string>();
    for (const item of aggregated) {
      TestValidator.predicate(
        `risk flag id ${item.id} not duplicated`,
        seen.has(item.id) === false,
      );
      seen.add(item.id);
    }
  }
}
