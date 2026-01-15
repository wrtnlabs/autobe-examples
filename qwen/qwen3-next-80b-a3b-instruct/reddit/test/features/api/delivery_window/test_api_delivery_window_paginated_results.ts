import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformDeliveryWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformDeliveryWindow";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformDeliveryWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformDeliveryWindow";
export async function test_api_delivery_window_paginated_results(
  connection: api.IConnection,
): Promise<void> {
  // Generate random request with pagination parameters
  const firstRequest = {
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformDeliveryWindow.IRequest;
  // Fetch first page of results
  const firstPage: IPageICommunityPlatformDeliveryWindow.ISummary =
    await api.functional.communityPlatform.delivery_windows.index(connection, {
      body: firstRequest,
    });
  typia.assert(firstPage);
  // Validate first page pagination metadata
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 10);
  TestValidator.predicate(
    "first page records > 0",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "first page pages >= 1",
    firstPage.pagination.pages >= 1,
  );
  TestValidator.equals("first page data length", firstPage.data.length, 10);
  // Extract data from first page for later comparison
  const firstPageIds = firstPage.data.map((item) => item.id);
  // Fetch second page of results
  const secondRequest = {
    page: 2,
    limit: 10,
  } satisfies ICommunityPlatformDeliveryWindow.IRequest;
  const secondPage: IPageICommunityPlatformDeliveryWindow.ISummary =
    await api.functional.communityPlatform.delivery_windows.index(connection, {
      body: secondRequest,
    });
  typia.assert(secondPage);
  // Validate second page pagination metadata
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 10);
  TestValidator.equals(
    "second page records",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page pages",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals("second page data length", secondPage.data.length, 10);
  // Extract data from second page for later comparison
  const secondPageIds = secondPage.data.map((item) => item.id);
  // Validate that pages are non-overlapping - no common IDs between paginated results
  const overlappingIds = firstPageIds.filter((id) =>
    secondPageIds.includes(id),
  );
  TestValidator.equals(
    "no overlapping IDs between pages",
    overlappingIds.length,
    0,
  );
  // Validate total records calculation
  const expectedPages = Math.ceil(firstPage.pagination.records / 10);
  TestValidator.equals(
    "calculated pages match",
    secondPage.pagination.pages,
    expectedPages,
  );
  // Validate that total records are consistent across both pages (same dataset)
  TestValidator.equals(
    "total records consistent",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  // Validate pagination follows correct sequence and boundary
  TestValidator.predicate(
    "first page end < second page start",
    firstPage.data[firstPage.data.length - 1].startTime <
      secondPage.data[0].startTime,
  );
}
