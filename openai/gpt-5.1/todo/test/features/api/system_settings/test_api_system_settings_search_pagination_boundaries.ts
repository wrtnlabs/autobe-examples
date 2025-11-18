import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppSystemSetting";
import type { ITodoAppAdminUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAdminUser";
import type { ITodoAppSystemSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppSystemSetting";

/**
 * Validate pagination boundary behavior for admin system settings search.
 *
 * Business goal: Ensure that PATCH /todoApp/adminUser/systemSettings returns
 * consistent pagination metadata and correctly segmented result sets when an
 * admin searches system settings across multiple pages. The test focuses on
 * boundary pages (first, middle, last) and a page beyond the last one.
 *
 * Scenario steps:
 *
 * 1. Register an admin user via POST /auth/adminUser/join to obtain an
 *    authenticated admin session (token automatically attached to connection by
 *    SDK).
 * 2. Create more ITodoAppSystemSetting records than a selected pageSize using POST
 *    /todoApp/adminUser/systemSettings so that PATCH
 *    /todoApp/adminUser/systemSettings will produce at least three pages of
 *    results.
 * 3. Request page 1 (page=1, pageSize=10) with no additional filters and verify:
 *
 *    - Pagination.current === 1
 *    - Pagination.limit === 10
 *    - Pagination.records >= createdCount
 *    - Pagination.pages >= 3
 *    - Data.length === 10
 * 4. Request page 2 with the same pageSize and verify equivalent metadata
 *    constraints plus that its items are distinct from page 1 (no overlapping
 *    ids).
 * 5. Request the last page using pagination.pages from a prior response and
 *    verify:
 *
 *    - Data.length <= pageSize
 *    - No item on the last page overlaps with items from earlier pages (simple
 *         global distinctness check across all collected pages).
 * 6. Request a page beyond the last (pages + 1) and verify that:
 *
 *    - Pagination.current equals the requested page index
 *    - Pagination.records and pagination.pages remain the same as the last in-range
 *         call
 *    - Data.length === 0.
 */
export async function test_api_system_settings_search_pagination_boundaries(
  connection: api.IConnection,
) {
  // 1. Register an admin user to obtain an authorized admin session.
  const joinBody = typia.random<ITodoAppAdminUser.IJoin>();
  const admin: ITodoAppAdminUser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create more system settings than pageSize so that we have at least 3 pages.
  const pageSize = 10;
  const totalToCreate = 25; // ensures at least 3 pages when limit=10

  const createdSettings: ITodoAppSystemSetting[] = await ArrayUtil.asyncRepeat(
    totalToCreate,
    async (index) => {
      const suffix = index.toString().padStart(2, "0");
      const keyBase = `test_pagination_setting_${suffix}`;
      const createBody = {
        key: keyBase,
        value: RandomGenerator.paragraph({ sentences: 3 }),
        type: RandomGenerator.pick([
          "int",
          "boolean",
          "string",
          "double",
        ] as const),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        group: "pagination-boundary-test",
        enabled: true,
      } satisfies ITodoAppSystemSetting.ICreate;

      const created =
        await api.functional.todoApp.adminUser.systemSettings.create(
          connection,
          { body: createBody },
        );
      typia.assert(created);
      return created;
    },
  );

  // Sanity check: we created the expected number.
  TestValidator.equals(
    "created settings count should match totalToCreate",
    createdSettings.length,
    totalToCreate,
  );

  // Helper to build a basic search request body with specific page and pageSize.
  const buildRequest = (
    page: number,
    pageSizeValue: number,
  ): ITodoAppSystemSetting.IRequest => ({
    page,
    pageSize: pageSizeValue,
  });

  // 3. Request page 1.
  const page1Request = buildRequest(1, pageSize);
  const page1: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: page1Request,
    });
  typia.assert(page1);

  const page1Pagination = page1.pagination;
  typia.assert<IPage.IPagination>(page1Pagination);

  TestValidator.equals(
    "page1 current page should be 1",
    page1Pagination.current,
    1,
  );
  TestValidator.equals(
    "page1 limit should equal requested pageSize",
    page1Pagination.limit,
    pageSize,
  );
  TestValidator.predicate(
    "page1 total records should be at least number created",
    page1Pagination.records >= createdSettings.length,
  );
  TestValidator.predicate(
    "page1 pages should be at least 3",
    page1Pagination.pages >= 3,
  );
  TestValidator.equals(
    "page1 data length should equal pageSize",
    page1.data.length,
    pageSize,
  );

  // Collect seen ids as we go to check distinctness later.
  const seenIds = new Set<string>();
  for (const summary of page1.data) {
    typia.assert<ITodoAppSystemSetting.ISummary>(summary);
    seenIds.add(summary.id);
  }

  // 4. Request page 2.
  const page2Request = buildRequest(2, pageSize);
  const page2: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: page2Request,
    });
  typia.assert(page2);

  const page2Pagination = page2.pagination;
  typia.assert<IPage.IPagination>(page2Pagination);

  TestValidator.equals(
    "page2 current page should be 2",
    page2Pagination.current,
    2,
  );
  TestValidator.equals(
    "page2 limit should equal requested pageSize",
    page2Pagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "page2 records should match page1 records",
    page2Pagination.records,
    page1Pagination.records,
  );
  TestValidator.equals(
    "page2 pages should match page1 pages",
    page2Pagination.pages,
    page1Pagination.pages,
  );
  TestValidator.equals(
    "page2 data length should equal pageSize",
    page2.data.length,
    pageSize,
  );

  for (const summary of page2.data) {
    typia.assert<ITodoAppSystemSetting.ISummary>(summary);
    TestValidator.predicate(
      "page2 items must not duplicate page1 items",
      seenIds.has(summary.id) === false,
    );
    seenIds.add(summary.id);
  }

  // 5. Request the last page.
  const lastPageIndex = page1Pagination.pages;
  const lastPageRequest = buildRequest(lastPageIndex, pageSize);
  const lastPage: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: lastPageRequest,
    });
  typia.assert(lastPage);

  const lastPagination = lastPage.pagination;
  typia.assert<IPage.IPagination>(lastPagination);

  TestValidator.equals(
    "last page current should equal pages",
    lastPagination.current,
    lastPageIndex,
  );
  TestValidator.equals(
    "last page limit should equal requested pageSize",
    lastPagination.limit,
    pageSize,
  );
  TestValidator.equals(
    "last page records should match previous records",
    lastPagination.records,
    page1Pagination.records,
  );
  TestValidator.equals(
    "last page pages should match previous pages",
    lastPagination.pages,
    page1Pagination.pages,
  );
  TestValidator.predicate(
    "last page data length should be at most pageSize",
    lastPage.data.length <= pageSize,
  );

  for (const summary of lastPage.data) {
    typia.assert<ITodoAppSystemSetting.ISummary>(summary);
    TestValidator.predicate(
      "last page items must not duplicate earlier items",
      seenIds.has(summary.id) === false,
    );
    seenIds.add(summary.id);
  }

  // 6. Request a page beyond the last.
  const beyondPageIndex = lastPagination.pages + 1;
  const beyondRequest = buildRequest(beyondPageIndex, pageSize);
  const beyond: IPageITodoAppSystemSetting.ISummary =
    await api.functional.todoApp.adminUser.systemSettings.index(connection, {
      body: beyondRequest,
    });
  typia.assert(beyond);

  const beyondPagination = beyond.pagination;
  typia.assert<IPage.IPagination>(beyondPagination);

  TestValidator.equals(
    "beyond-last current should equal requested page index",
    beyondPagination.current,
    beyondPageIndex,
  );
  TestValidator.equals(
    "beyond-last records should remain unchanged",
    beyondPagination.records,
    lastPagination.records,
  );
  TestValidator.equals(
    "beyond-last pages should remain unchanged",
    beyondPagination.pages,
    lastPagination.pages,
  );
  TestValidator.equals("beyond-last data must be empty", beyond.data.length, 0);
}
