import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_popular_feed_pagination_contiguity(
  connection: api.IConnection,
): Promise<void> {
  const limit = 10;
  // --------------------------------------------------
  // Test A — Offset-based pagination with "new" sort
  // --------------------------------------------------
  // 1. Get page 1
  const page1 =
    await api.functional.communityPlatform.posts.feeds.popular.index(
      connection,
      {
        body: {
          sort: "new",
          limit,
          page: 1,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(page1);
  TestValidator.equals("page 1 current is 1", page1.pagination.current, 1);
  TestValidator.equals(
    "page 1 limit matches request",
    page1.pagination.limit,
    limit,
  );
  TestValidator.predicate("page 1 has data", page1.data.length > 0);
  TestValidator.predicate(
    "page 1 data within limit",
    page1.data.length <= limit,
  );
  // 2. Get page 2
  const page2 =
    await api.functional.communityPlatform.posts.feeds.popular.index(
      connection,
      {
        body: {
          sort: "new",
          limit,
          page: 2,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(page2);
  TestValidator.equals("page 2 current is 2", page2.pagination.current, 2);
  TestValidator.equals(
    "page 2 limit matches request",
    page2.pagination.limit,
    limit,
  );
  // 3. Verify contiguity: no overlap, created_at DESC order maintained
  const page1Ids = new Set(page1.data.map((p) => p.id));
  const page2Ids = new Set(page2.data.map((p) => p.id));
  const overlapExists = [...page2Ids].some((id) => page1Ids.has(id));
  TestValidator.predicate("no ID overlap between pages", !overlapExists);
  if (page1.data.length > 0 && page2.data.length > 0) {
    const lastOfPage1 = page1.data[page1.data.length - 1];
    const firstOfPage2 = page2.data[0];
    // "new" sort: created_at DESC. Last on page 1 is older than/equal to first on page 2
    TestValidator.predicate(
      "chronological order preserved across pages",
      lastOfPage1.created_at >= firstOfPage2.created_at,
    );
    // Verify each page's internal order is correct
    for (let i = 1; i < page1.data.length; i++) {
      TestValidator.predicate(
        `page 1 item ${i - 1} is newer than item ${i}`,
        page1.data[i - 1].created_at >= page1.data[i].created_at,
      );
    }
    for (let i = 1; i < page2.data.length; i++) {
      TestValidator.predicate(
        `page 2 item ${i - 1} is newer than item ${i}`,
        page2.data[i - 1].created_at >= page2.data[i].created_at,
      );
    }
  }
  // 4. Validate pagination metadata consistency
  if (page1.pagination.records > 0) {
    const expectedPages = Math.ceil(page1.pagination.records / limit);
    TestValidator.equals(
      "total pages calculation is correct",
      page1.pagination.pages,
      expectedPages,
    );
  }
  // 5. Out-of-range page returns empty data with accurate metadata
  const outOfRangePage =
    await api.functional.communityPlatform.posts.feeds.popular.index(
      connection,
      {
        body: {
          sort: "new",
          limit,
          page: 9999,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(outOfRangePage);
  TestValidator.equals(
    "out-of-range page has empty data",
    outOfRangePage.data.length,
    0,
  );
  TestValidator.equals(
    "out-of-range page records matches total",
    outOfRangePage.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "out-of-range page pages matches total",
    outOfRangePage.pagination.pages,
    page1.pagination.pages,
  );
  // --------------------------------------------------
  // Test B — Cursor-based pagination
  // --------------------------------------------------
  // 6. Call without cursor to get reference page
  const cursorPage1 =
    await api.functional.communityPlatform.posts.feeds.popular.index(
      connection,
      {
        body: {
          sort: "new",
          limit,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(cursorPage1);
  // For "new" sort, cursor encodes created_at timestamp
  if (cursorPage1.data.length > 0) {
    const lastItem = cursorPage1.data[cursorPage1.data.length - 1];
    const cursorPage2 =
      await api.functional.communityPlatform.posts.feeds.popular.index(
        connection,
        {
          body: {
            sort: "new",
            limit,
            cursor: lastItem.created_at,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    typia.assert(cursorPage2);
    // 7. Verify no overlap with cursor-based page
    if (cursorPage2.data.length > 0) {
      const cursorPage1Ids = new Set(cursorPage1.data.map((p) => p.id));
      const cursorOverlap = cursorPage2.data.some((p) =>
        cursorPage1Ids.has(p.id),
      );
      TestValidator.predicate(
        "no overlap in cursor-based pagination",
        !cursorOverlap,
      );
    }
    // 8. Verify cursor takes precedence over page when both provided
    const cursorWithPage =
      await api.functional.communityPlatform.posts.feeds.popular.index(
        connection,
        {
          body: {
            sort: "new",
            limit,
            cursor: lastItem.created_at,
            page: 1,
          } satisfies ICommunityPlatformPost.IRequest,
        },
      );
    typia.assert(cursorWithPage);
    if (cursorWithPage.data.length > 0 && cursorPage1.data.length > 0) {
      const firstWithCursor = cursorWithPage.data[0];
      const firstOfCursorPage1 = cursorPage1.data[0];
      TestValidator.notEquals(
        "cursor takes precedence over page parameter",
        firstWithCursor.id,
        firstOfCursorPage1.id,
      );
    }
  }
  // --------------------------------------------------
  // Test C — Search filter with pagination
  // --------------------------------------------------
  // 9. Search with pagination
  const searchResult =
    await api.functional.communityPlatform.posts.feeds.popular.index(
      connection,
      {
        body: {
          search: "test",
          limit: 5,
        } satisfies ICommunityPlatformPost.IRequest,
      },
    );
  typia.assert(searchResult);
  TestValidator.equals(
    "search result page current is 1",
    searchResult.pagination.current,
    1,
  );
  TestValidator.predicate(
    "search results within limit",
    searchResult.data.length <= 5,
  );
  // All returned posts must contain "test" in title (case-insensitive)
  for (const post of searchResult.data) {
    TestValidator.predicate(
      `search filter matched post "${post.title}"`,
      post.title.toLowerCase().includes("test"),
    );
  }
}
