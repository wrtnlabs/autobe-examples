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

export async function test_api_manager_list_paginated_summary_browsing(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: connection.headers,
    simulate: connection.simulate,
    logger: connection.logger,
    encryption: connection.encryption,
    options: connection.options,
    fetch: connection.fetch,
  };
  const firstRequest = {
    page: 1,
    limit: 10,
    sort: "created_at:desc",
  } satisfies IHrmTimeTrackingManager.IRequest;
  const firstPage = await api.functional.hrmTimeTracking.managers.index(
    adminConnection,
    {
      body: firstRequest,
    },
  );
  typia.assert<IPageIHrmTimeTrackingManager.ISummary>(firstPage);
  const repeatedFirstPage = await api.functional.hrmTimeTracking.managers.index(
    adminConnection,
    {
      body: firstRequest,
    },
  );
  typia.assert<IPageIHrmTimeTrackingManager.ISummary>(repeatedFirstPage);
  TestValidator.equals(
    "requested current page is preserved on first response",
    firstPage.pagination.current,
    firstRequest.page,
  );
  TestValidator.equals(
    "requested limit is preserved on first response",
    firstPage.pagination.limit,
    firstRequest.limit,
  );
  TestValidator.equals(
    "repeated request current page matches first response",
    repeatedFirstPage.pagination.current,
    firstPage.pagination.current,
  );
  TestValidator.equals(
    "repeated request limit matches first response",
    repeatedFirstPage.pagination.limit,
    firstPage.pagination.limit,
  );
  TestValidator.equals(
    "repeated request record count matches first response",
    repeatedFirstPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "repeated request page count matches first response",
    repeatedFirstPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "repeated request item ids stay in the same order",
    repeatedFirstPage.data.map((item) => item.id),
    firstPage.data.map((item) => item.id),
  );
  TestValidator.predicate(
    "first page data length does not exceed requested limit",
    firstPage.data.length <= firstRequest.limit,
  );
  TestValidator.predicate(
    "first page data length does not exceed returned limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.predicate(
    "repeated first page data length does not exceed requested limit",
    repeatedFirstPage.data.length <= firstRequest.limit,
  );
  TestValidator.predicate(
    "repeated first page data length does not exceed returned limit",
    repeatedFirstPage.data.length <= repeatedFirstPage.pagination.limit,
  );
  TestValidator.predicate(
    "first page record count is non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page total pages is non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "first page count matches records and limit",
    firstPage.pagination.pages,
    firstPage.pagination.records === 0
      ? 0
      : Math.ceil(firstPage.pagination.records / firstPage.pagination.limit),
  );
  TestValidator.equals(
    "repeated first page count matches records and limit",
    repeatedFirstPage.pagination.pages,
    repeatedFirstPage.pagination.records === 0
      ? 0
      : Math.ceil(
          repeatedFirstPage.pagination.records /
            repeatedFirstPage.pagination.limit,
        ),
  );
  if (firstPage.pagination.pages === 0) {
    TestValidator.equals(
      "zero pages implies zero records",
      firstPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "zero pages implies empty data",
      firstPage.data.length,
      0,
    );
  }
  const firstIds = new Set<string>();
  for (const item of firstPage.data) {
    typia.assert<IHrmTimeTrackingManager.ISummary>(item);
    TestValidator.equals(
      "manager summary exposes only safe fields",
      Object.keys(item).sort(),
      ["created_at", "deleted_at", "email", "id", "updated_at"],
    );
    TestValidator.predicate(
      "manager id is unique within first page",
      firstIds.has(item.id) === false,
    );
    firstIds.add(item.id);
    TestValidator.predicate(
      "manager email is not empty",
      item.email.length > 0,
    );
  }
  const secondRequest = {
    page: 1,
    limit: 5,
    sort: "email:asc",
  } satisfies IHrmTimeTrackingManager.IRequest;
  const secondPage = await api.functional.hrmTimeTracking.managers.index(
    adminConnection,
    {
      body: secondRequest,
    },
  );
  typia.assert<IPageIHrmTimeTrackingManager.ISummary>(secondPage);
  TestValidator.equals(
    "requested current page is preserved on second response",
    secondPage.pagination.current,
    secondRequest.page,
  );
  TestValidator.equals(
    "requested limit is preserved on second response",
    secondPage.pagination.limit,
    secondRequest.limit,
  );
  TestValidator.predicate(
    "second page data length does not exceed requested limit",
    secondPage.data.length <= secondRequest.limit,
  );
  TestValidator.predicate(
    "second page data length does not exceed returned limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  TestValidator.predicate(
    "second page record count is non-negative",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "second page total pages is non-negative",
    secondPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "second page count matches records and limit",
    secondPage.pagination.pages,
    secondPage.pagination.records === 0
      ? 0
      : Math.ceil(secondPage.pagination.records / secondPage.pagination.limit),
  );
  if (secondPage.pagination.pages === 0) {
    TestValidator.equals(
      "second response zero pages implies zero records",
      secondPage.pagination.records,
      0,
    );
    TestValidator.equals(
      "second response zero pages implies empty data",
      secondPage.data.length,
      0,
    );
  }
  const secondIds = new Set<string>();
  for (const item of secondPage.data) {
    typia.assert<IHrmTimeTrackingManager.ISummary>(item);
    TestValidator.equals(
      "second response manager summary exposes only safe fields",
      Object.keys(item).sort(),
      ["created_at", "deleted_at", "email", "id", "updated_at"],
    );
    TestValidator.predicate(
      "manager id is unique within second page",
      secondIds.has(item.id) === false,
    );
    secondIds.add(item.id);
    TestValidator.predicate(
      "second response manager email is not empty",
      item.email.length > 0,
    );
  }
}
