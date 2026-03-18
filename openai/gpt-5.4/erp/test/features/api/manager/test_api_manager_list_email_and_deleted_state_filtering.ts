import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingManager";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingManager } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingManager";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_manager_list_email_and_deleted_state_filtering(
  connection: api.IConnection,
): Promise<void> {
  const managerConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const assertPagination = (
    title: string,
    page: IPageIHrmTimeTrackingManager.ISummary,
    request: IHrmTimeTrackingManager.IRequest,
  ): void => {
    TestValidator.equals(
      `${title} pagination current matches request`,
      page.pagination.current,
      request.page ?? 1,
    );
    if (request.limit !== undefined) {
      TestValidator.equals(
        `${title} pagination limit matches request`,
        page.pagination.limit,
        request.limit,
      );
    }
    TestValidator.predicate(
      `${title} page length within limit`,
      page.data.length <= page.pagination.limit,
    );
    TestValidator.predicate(
      `${title} records cover returned data length`,
      page.pagination.records >= page.data.length,
    );
    TestValidator.equals(
      `${title} pages metadata is consistent`,
      page.pagination.pages,
      page.pagination.records === 0
        ? 0
        : Math.ceil(page.pagination.records / page.pagination.limit),
    );
  };
  const baselineRequest = {
    page: 1,
    limit: 20,
    sort: "email:asc",
  } satisfies IHrmTimeTrackingManager.IRequest;
  const baselinePage = await api.functional.hrmTimeTracking.managers.index(
    managerConnection,
    {
      body: baselineRequest,
    },
  );
  typia.assert(baselinePage);
  assertPagination("baseline", baselinePage, baselineRequest);
  TestValidator.predicate(
    "baseline page is sorted by email ascending",
    baselinePage.data.every(
      (manager: IHrmTimeTrackingManager.ISummary, index: number) =>
        index === 0 ||
        baselinePage.data[index - 1]!.email.localeCompare(manager.email) <= 0,
    ),
  );
  const activeRequest = {
    page: 1,
    limit: 20,
    isDeleted: false,
    sort: "email:asc",
  } satisfies IHrmTimeTrackingManager.IRequest;
  const activePage = await api.functional.hrmTimeTracking.managers.index(
    managerConnection,
    {
      body: activeRequest,
    },
  );
  typia.assert(activePage);
  assertPagination("active", activePage, activeRequest);
  TestValidator.predicate(
    "active page contains only non-deleted managers",
    activePage.data.every(
      (manager: IHrmTimeTrackingManager.ISummary) =>
        manager.deleted_at === null,
    ),
  );
  TestValidator.predicate(
    "active page is sorted by email ascending",
    activePage.data.every(
      (manager: IHrmTimeTrackingManager.ISummary, index: number) =>
        index === 0 ||
        activePage.data[index - 1]!.email.localeCompare(manager.email) <= 0,
    ),
  );
  const deletedRequest = {
    page: 1,
    limit: 20,
    isDeleted: true,
    sort: "deleted_at:desc",
  } satisfies IHrmTimeTrackingManager.IRequest;
  const deletedPage = await api.functional.hrmTimeTracking.managers.index(
    managerConnection,
    {
      body: deletedRequest,
    },
  );
  typia.assert(deletedPage);
  assertPagination("deleted", deletedPage, deletedRequest);
  TestValidator.predicate(
    "deleted page contains only deleted managers",
    deletedPage.data.every(
      (manager: IHrmTimeTrackingManager.ISummary) =>
        manager.deleted_at !== null,
    ),
  );
  TestValidator.predicate(
    "deleted page is sorted by deleted_at descending",
    deletedPage.data.every(
      (manager: IHrmTimeTrackingManager.ISummary, index: number) => {
        if (index === 0) return true;
        const previousDeletedAt = deletedPage.data[index - 1]!.deleted_at;
        const currentDeletedAt = manager.deleted_at;
        return (
          previousDeletedAt !== null &&
          currentDeletedAt !== null &&
          new Date(previousDeletedAt).getTime() >=
            new Date(currentDeletedAt).getTime()
        );
      },
    ),
  );
  const sampledManager: IHrmTimeTrackingManager.ISummary | undefined =
    baselinePage.data.find(
      (manager: IHrmTimeTrackingManager.ISummary) => manager.email.length > 0,
    );
  if (sampledManager !== undefined) {
    const localPart =
      sampledManager.email.split("@")[0] ?? sampledManager.email;
    const searchTerm =
      localPart.length >= 3
        ? localPart.slice(0, 3)
        : sampledManager.email.slice(
            0,
            Math.max(1, sampledManager.email.length),
          );
    const searchRequest = {
      page: 1,
      limit: 20,
      search: searchTerm,
      sort: "email:asc",
    } satisfies IHrmTimeTrackingManager.IRequest;
    const searchPage = await api.functional.hrmTimeTracking.managers.index(
      managerConnection,
      {
        body: searchRequest,
      },
    );
    typia.assert(searchPage);
    assertPagination("search", searchPage, searchRequest);
    TestValidator.predicate(
      "search page contains only matching emails",
      searchPage.data.every((manager: IHrmTimeTrackingManager.ISummary) =>
        manager.email.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
    TestValidator.predicate(
      "search page includes sampled manager",
      searchPage.data.some(
        (manager: IHrmTimeTrackingManager.ISummary) =>
          manager.id === sampledManager.id,
      ),
    );
    TestValidator.predicate(
      "search page is sorted by email ascending",
      searchPage.data.every(
        (manager: IHrmTimeTrackingManager.ISummary, index: number) =>
          index === 0 ||
          searchPage.data[index - 1]!.email.localeCompare(manager.email) <= 0,
      ),
    );
  }
  const sampledDeletedManager: IHrmTimeTrackingManager.ISummary | undefined =
    deletedPage.data.find(
      (manager: IHrmTimeTrackingManager.ISummary) =>
        manager.deleted_at !== null,
    );
  if (
    sampledDeletedManager !== undefined &&
    sampledDeletedManager.deleted_at !== null
  ) {
    const sampledDeletedAt = sampledDeletedManager.deleted_at;
    const deletedRangeRequest = {
      page: 1,
      limit: 20,
      isDeleted: true,
      deleted_at_from: sampledDeletedAt,
      deleted_at_to: sampledDeletedAt,
      sort: "deleted_at:desc",
    } satisfies IHrmTimeTrackingManager.IRequest;
    const deletedRangePage =
      await api.functional.hrmTimeTracking.managers.index(managerConnection, {
        body: deletedRangeRequest,
      });
    typia.assert(deletedRangePage);
    assertPagination("deleted range", deletedRangePage, deletedRangeRequest);
    TestValidator.predicate(
      "deleted range page contains only deleted managers",
      deletedRangePage.data.every(
        (manager: IHrmTimeTrackingManager.ISummary) =>
          manager.deleted_at !== null,
      ),
    );
    TestValidator.predicate(
      "deleted range page stays within inclusive bounds",
      deletedRangePage.data.every(
        (manager: IHrmTimeTrackingManager.ISummary) =>
          manager.deleted_at !== null &&
          new Date(manager.deleted_at).getTime() >=
            new Date(sampledDeletedAt).getTime() &&
          new Date(manager.deleted_at).getTime() <=
            new Date(sampledDeletedAt).getTime(),
      ),
    );
    TestValidator.predicate(
      "deleted range page includes sampled deleted manager",
      deletedRangePage.data.some(
        (manager: IHrmTimeTrackingManager.ISummary) =>
          manager.id === sampledDeletedManager.id,
      ),
    );
  }
  const emptyRequest = {
    page: 1,
    limit: 20,
    email: `no-match-${RandomGenerator.alphaNumeric(24)}@${RandomGenerator.alphabets(12)}.com`,
    sort: "email:asc",
  } satisfies IHrmTimeTrackingManager.IRequest;
  const emptyPage = await api.functional.hrmTimeTracking.managers.index(
    managerConnection,
    {
      body: emptyRequest,
    },
  );
  typia.assert(emptyPage);
  assertPagination("empty", emptyPage, emptyRequest);
  TestValidator.equals("empty page has no data", emptyPage.data.length, 0);
}
