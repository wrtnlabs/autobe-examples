import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTimeTrackingGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_guest_paginated_listing(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Call without any filter parameters to get the first page
  const page1 = await api.functional.hrmTimeTracking.guests.index(connection, {
    body: {} satisfies IHrmTimeTrackingGuest.IRequest,
  });
  typia.assert(page1);
  // Step 2: Validate pagination metadata types and structure
  const pagination = page1.pagination;
  TestValidator.equals(
    "pagination current type",
    typeof pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit type",
    typeof pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination records type",
    typeof pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination pages type",
    typeof pagination.pages,
    "number",
  );
  // Step 3: Validate each record has required fields
  for (const record of page1.data) {
    typia.assert(record);
  }
  // Step 4: If there are multiple records, validate they are sorted by created_at descending
  if (page1.data.length >= 2) {
    for (let i = 1; i < page1.data.length; i++) {
      TestValidator.predicate(
        `record ${i} created_at <= record ${i - 1} created_at`,
        page1.data[i].created_at <= page1.data[i - 1].created_at,
      );
    }
  }
  // Step 5: Call with explicit pagination parameters
  const page2 = await api.functional.hrmTimeTracking.guests.index(connection, {
    body: {
      page: 1 satisfies number,
      limit: 5 satisfies number,
    } satisfies IHrmTimeTrackingGuest.IRequest,
  });
  typia.assert(page2);
  // Step 6: Validate pagination parameters are respected
  TestValidator.equals("current page is 1", page2.pagination.current, 1);
  TestValidator.predicate("limit is at most 5", page2.pagination.limit <= 5);
  TestValidator.predicate(
    "data length ≤ limit",
    page2.data.length <= page2.pagination.limit,
  );
  TestValidator.equals("pagination limit matches", page2.pagination.limit, 5);
  // Step 7: Validate pages calculation
  if (page2.pagination.records > 0) {
    const expectedPages = Math.ceil(
      page2.pagination.records / page2.pagination.limit,
    );
    TestValidator.equals(
      "pages calculated correctly",
      page2.pagination.pages,
      expectedPages,
    );
  } else {
    TestValidator.equals("no records means 0 pages", page2.pagination.pages, 0);
  }
  // Step 8: Validate non-empty fields on each record when records exist
  for (const record of page2.data) {
    TestValidator.predicate("non-empty id", record.id !== "");
    TestValidator.predicate(
      "non-empty device_fingerprint",
      record.device_fingerprint !== "",
    );
  }
}
