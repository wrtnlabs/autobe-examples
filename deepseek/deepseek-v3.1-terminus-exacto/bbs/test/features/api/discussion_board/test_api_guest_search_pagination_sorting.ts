import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_search_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test different pagination configurations
  const testConfigs = [
    // Basic pagination tests
    { page: 1, limit: 10, sort: "created_at_desc" as const },
    { page: 2, limit: 5, sort: "created_at_asc" as const },
    // Edge cases
    { page: 999, limit: 100, sort: "created_at_desc" as const }, // Page beyond data
    { page: 1, limit: 1, sort: "created_at_desc" as const }, // Minimum limit
    { page: 1, limit: 100, sort: "created_at_desc" as const }, // Maximum limit
  ];
  
  let lastResult: any = null;
  
  for (const config of testConfigs) {
    const searchParams: IDiscussionBoardGuest.IRequest = {
      page: config.page,
      limit: config.limit,
      sort: config.sort,
    };
    const result = await api.functional.discussionBoard.guests.index(
      connection,
      {
        body: searchParams,
      },
    );
    typia.assert(result);
    lastResult = result;
    
    // Validate pagination metadata
    TestValidator.equals(
      "pagination metadata - current page",
      result.pagination.current,
      config.page,
    );
    TestValidator.equals(
      "pagination metadata - limit",
      result.pagination.limit,
      config.limit,
    );
    TestValidator.predicate(
      "pagination metadata - total records valid",
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination metadata - total pages valid",
      result.pagination.pages >= 0,
    );
    // Validate data array size
    TestValidator.predicate(
      "data size does not exceed limit",
      result.data.length <= config.limit,
    );
    // Validate sorting when we have data
    if (result.data.length >= 2 && config.sort) {
      for (let i = 1; i < result.data.length; i++) {
        const prevDate = new Date(result.data[i - 1].created_at);
        const currDate = new Date(result.data[i].created_at);
        if (config.sort === "created_at_desc") {
          // Should be newest first (descending)
          TestValidator.predicate(
            "sorting descending - previous >= current",
            prevDate >= currDate,
          );
        } else if (config.sort === "created_at_asc") {
          // Should be oldest first (ascending)
          TestValidator.predicate(
            "sorting ascending - previous <= current",
            prevDate <= currDate,
          );
        }
      }
    }
  }
  
  // Test with date range filters
  const now = new Date();
  const futureDate = new Date(now.getTime() + 86400000).toISOString(); // Tomorrow
  const futureFilter: IDiscussionBoardGuest.IRequest = {
    created_at_start: futureDate satisfies string &
      tags.Format<"date-time"> as string & tags.Format<"date-time">,
    page: 1,
    limit: 10,
    sort: "created_at_desc",
  };
  const emptyResult = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: futureFilter,
    },
  );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty result from future date filter",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty result has zero total records",
    emptyResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result has zero total pages",
    emptyResult.pagination.pages,
    0,
  );
  // Test without pagination parameters (should use defaults)
  const defaultSearch: IDiscussionBoardGuest.IRequest = {
    sort: "created_at_desc",
  };
  const defaultResult = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: defaultSearch,
    },
  );
  typia.assert(defaultResult);
  // Default page should be 1
  TestValidator.equals(
    "default page is 1",
    defaultResult.pagination.current,
    1,
  );
  // Test with device fingerprint filter
  const randomFingerprint = RandomGenerator.alphaNumeric(32);
  const fingerprintSearch: IDiscussionBoardGuest.IRequest = {
    device_fingerprint: randomFingerprint, // Likely no matches
    page: 1,
    limit: 10,
    sort: "created_at_desc",
  };
  const fingerprintResult = await api.functional.discussionBoard.guests.index(
    connection,
    {
      body: fingerprintSearch,
    },
  );
  typia.assert(fingerprintResult);
  // Validate page calculation
  TestValidator.predicate(
    "total pages calculation",
    lastResult.pagination.pages ===
      Math.ceil(lastResult.pagination.records / lastResult.pagination.limit) ||
      (lastResult.pagination.records === 0 && lastResult.pagination.pages === 0),
  );
}