import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityHubGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityHubGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityHubGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test cursor-based pagination for the guest listing endpoint.
 *
 * Verifies that cursor-based pagination using the created_at timestamp works correctly for the guest listing API. Guests are anonymous visitors tracked by device fingerprint, and their records should be retrievable in a paginated manner with consistent descending ordering by creation time.
 *
 * 1. Fetches the first page with a small limit of 2 to establish a baseline and verify response structure including pagination metadata.
 * 2. Validates that records on the first page are sorted by created_at in descending order (newest first).
 * 3. Extracts the created_at timestamp of the last record from the first page to use as the cursor for the second page.
 * 4. Fetches the second page with the cursor and validates that no records overlap with the first page.
 * 5. Confirms all records on the second page have created_at values strictly before the cursor timestamp.
 * 6. Verifies that the second page is also sorted by created_at descending and that the last page may contain fewer records than the limit.
 */
export async function test_api_guest_listing_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  const limit = 2 satisfies number as number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100>;
  // 1. Fetch first page without cursor
  const page1 = await api.functional.communityHub.guests.index(connection, {
    body: {
      limit,
    } satisfies ICommunityHubGuest.IRequest,
  });
  typia.assert(page1);
  TestValidator.predicate("first page has records", page1.data.length > 0);
  TestValidator.predicate(
    "pagination limit matches request",
    page1.pagination.limit === limit,
  );
  TestValidator.predicate(
    "pagination current is page 1",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "total records is positive",
    page1.pagination.records > 0,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    page1.pagination.pages >= 1,
  );
  // 2. Verify first page is sorted descending by created_at
  for (let i = 1; i < page1.data.length; i++) {
    TestValidator.predicate(
      `page1 sorted descending at index ${i}`,
      page1.data[i - 1].created_at >= page1.data[i].created_at,
    );
  }
  // 3. If multiple pages exist, test cursor pagination
  if (page1.data.length >= limit && page1.pagination.records > limit) {
    const cursor = page1.data[page1.data.length - 1].created_at;
    const page2 = await api.functional.communityHub.guests.index(connection, {
      body: {
        limit,
        cursor,
      } satisfies ICommunityHubGuest.IRequest,
    });
    typia.assert(page2);
    // 4. Verify no overlap between pages
    const page1Ids = new Set(page1.data.map((guest) => guest.id));
    TestValidator.predicate(
      "no overlap between page1 and page2 records",
      page2.data.every((guest) => !page1Ids.has(guest.id)),
    );
    // 5. Verify cursor condition: all page2 records have created_at strictly before cursor
    if (page2.data.length > 0) {
      TestValidator.predicate(
        "all page2 records are strictly before cursor timestamp",
        page2.data.every((guest) => guest.created_at < cursor),
      );
      // 6. Verify page2 is also sorted descending by created_at
      for (let i = 1; i < page2.data.length; i++) {
        TestValidator.predicate(
          `page2 sorted descending at index ${i}`,
          page2.data[i - 1].created_at >= page2.data[i].created_at,
        );
      }
    }
    // 7. Verify last page may contain fewer records than limit
    TestValidator.predicate(
      "page2 records do not exceed limit",
      page2.data.length <= limit,
    );
  }
}
