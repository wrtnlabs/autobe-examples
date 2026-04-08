import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditPlatformGuest.IJoin>(),
  });
  typia.assert(guestSession);
  // 2. Test offset-based pagination (page=1, limit=20)
  const page1 = await api.functional.redditPlatform.guest.search.posts.index(
    guestConnection,
    {
      body: { limit: 20, page: 1 } satisfies IRedditPlatformPost.ISearchRequest,
    },
  );
  typia.assert(page1);
  // 3. Test offset-based pagination (page=2, limit=20)
  const page2 = await api.functional.redditPlatform.guest.search.posts.index(
    guestConnection,
    {
      body: { limit: 20, page: 2 } satisfies IRedditPlatformPost.ISearchRequest,
    },
  );
  typia.assert(page2);
  // 4. Validate offset pagination metadata
  TestValidator.equals("page 1 current", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 20);
  TestValidator.equals("page 2 current", page2.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2.pagination.limit, 20);
  TestValidator.equals(
    "page 2 records",
    page2.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 1 pages",
    page1.pagination.pages,
    page2.pagination.pages,
  );
  // 5. Validate pagination page consistency - page 1 should have next if current < pages
  TestValidator.predicate(
    "page 1 current valid",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "page 1 is first page",
    page1.pagination.current === 1,
  );
  TestValidator.predicate(
    "page 1 has more pages if records exceed limit",
    page1.pagination.records > 20 ||
      page1.pagination.current < page1.pagination.pages,
  );
  // 6. Test cursor-based pagination
  // Note: Cursor format is UUID timestamp for 'after' parameter
  // Extract potential cursor from last item's created_at timestamp
  let cursorToken: string | undefined = undefined;
  if (page1.data.length > 0) {
    // Use created_at as potential cursor for next page
    cursorToken = page1.data[page1.data.length - 1].created_at;
  }
  // 7. Test cursor-based pagination with extracted cursor
  if (cursorToken) {
    const cursorPage =
      await api.functional.redditPlatform.guest.search.posts.index(
        guestConnection,
        {
          body: {
            limit: 20,
            after: cursorToken,
          } satisfies IRedditPlatformPost.ISearchRequest,
        },
      );
    typia.assert(cursorPage);
    // Validate cursor pagination returns subsequent records
    TestValidator.equals(
      "cursor page current",
      cursorPage.pagination.current,
      page1.pagination.current,
    );
    TestValidator.equals("cursor page limit", cursorPage.pagination.limit, 20);
    TestValidator.equals(
      "cursor page records",
      cursorPage.pagination.records,
      page1.pagination.records,
    );
  }
  // 8. Test boundary condition - page beyond available pages
  const boundaryPage =
    await api.functional.redditPlatform.guest.search.posts.index(
      guestConnection,
      {
        body: {
          limit: 20,
          page: page1.pagination.pages + 100,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(boundaryPage);
  TestValidator.equals(
    "boundary page records",
    boundaryPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "boundary page pages",
    boundaryPage.pagination.pages,
    page1.pagination.pages,
  );
  TestValidator.equals(
    "boundary page limit",
    boundaryPage.pagination.limit,
    20,
  );
  TestValidator.equals(
    "boundary page current",
    boundaryPage.pagination.current,
    page1.pagination.pages + 100,
  );
  TestValidator.equals("boundary page data", boundaryPage.data.length, 0);
  // 9. Test large limit (maximum 100)
  const largeLimitPage =
    await api.functional.redditPlatform.guest.search.posts.index(
      guestConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(largeLimitPage);
  TestValidator.equals(
    "large limit current",
    largeLimitPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "large limit limit",
    largeLimitPage.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "large limit records positive",
    largeLimitPage.pagination.records > 0,
  );
  TestValidator.equals(
    "large limit pages calculation",
    largeLimitPage.pagination.pages,
    Math.ceil(largeLimitPage.pagination.records / 100),
  );
  // 10. Test minimum limit (1 item per page)
  const minLimitPage =
    await api.functional.redditPlatform.guest.search.posts.index(
      guestConnection,
      {
        body: {
          limit: 1,
          page: 1,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(minLimitPage);
  TestValidator.equals("min limit current", minLimitPage.pagination.current, 1);
  TestValidator.equals("min limit limit", minLimitPage.pagination.limit, 1);
  TestValidator.predicate(
    "min limit records positive",
    minLimitPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "min limit page size valid",
    minLimitPage.data.length >= 1 && minLimitPage.data.length <= 1,
  );
  // 11. Test empty result set pagination (search with non-matching term)
  const emptySearch =
    await api.functional.redditPlatform.guest.search.posts.index(
      guestConnection,
      {
        body: {
          search: "xyz_nonexistent_post_title_12345",
          limit: 20,
          page: 1,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(emptySearch);
  TestValidator.equals(
    "empty search records",
    emptySearch.pagination.records,
    0,
  );
  TestValidator.equals("empty search pages", emptySearch.pagination.pages, 0);
  TestValidator.equals("empty search limit", emptySearch.pagination.limit, 20);
  TestValidator.equals(
    "empty search current",
    emptySearch.pagination.current,
    1,
  );
  TestValidator.equals("empty search data", emptySearch.data.length, 0);
}
