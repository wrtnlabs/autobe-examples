import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageITodoAppGuest";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test paginated listing of all guest identities without fingerprint filtering.
 *
 * Validates that the guest listing endpoint returns a properly paginated response ordered by creation date descending (newest first). Ensures pagination metadata is internally consistent and that page navigation correctly retrieves different subsets when navigating through the result set.
 *
 * The test issues paginated requests with a small limit to force multiple pages, then validates ordering integrity and metadata accuracy. When sufficient data exists, it navigates to a second page and confirms the data differs from the first page while the total record count remains stable.
 *
 * 1. Request first page with limit 3 and no fingerprint filter.
 * 2. Validate pagination metadata: current page, limit, non-negative records, pages calculation.
 * 3. Validate created_at descending ordering across all entries.
 * 4. If multiple pages exist, request page 2 and validate navigation produces different data.
 */
export async function test_api_guest_list_all_paginated(
  connection: api.IConnection,
): Promise<void> {
  // 1. Request first page with small limit
  const page1 = await api.functional.todoApp.guests.index(connection, {
    body: {
      page: 1 satisfies number as number,
      limit: 3 satisfies number as number,
    } satisfies ITodoAppGuest.IRequest,
  });
  typia.assert(page1);
  // 2. Validate pagination metadata
  TestValidator.equals("pagination current page", page1.pagination.current, 1);
  TestValidator.equals("pagination limit", page1.pagination.limit, 3);
  TestValidator.predicate(
    "records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculation",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
  // 3. Validate ordering: created_at descending (newest first)
  if (page1.data.length > 1) {
    for (let i = 1; i < page1.data.length; i++) {
      const prevTime = new Date(page1.data[i - 1].created_at).getTime();
      const currTime = new Date(page1.data[i].created_at).getTime();
      TestValidator.predicate(
        `created_at descending at index ${i}`,
        prevTime >= currTime,
      );
    }
  }
  // 4. Navigate to page 2 if multiple pages exist
  if (page1.pagination.pages > 1) {
    const page2 = await api.functional.todoApp.guests.index(connection, {
      body: {
        page: 2 satisfies number as number,
        limit: 3 satisfies number as number,
      } satisfies ITodoAppGuest.IRequest,
    });
    typia.assert(page2);
    TestValidator.equals("page2 current", page2.pagination.current, 2);
    TestValidator.equals("page2 limit", page2.pagination.limit, 3);
    TestValidator.equals(
      "page2 records count consistent",
      page2.pagination.records,
      page1.pagination.records,
    );
    if (page1.data.length > 0 && page2.data.length > 0) {
      TestValidator.notEquals(
        "page1 and page2 have different data",
        page1.data[0].id,
        page2.data[0].id,
      );
    }
  }
}
