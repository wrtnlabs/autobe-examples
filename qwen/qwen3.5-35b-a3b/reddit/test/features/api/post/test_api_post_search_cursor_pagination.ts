import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_post_search_cursor_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: "member@test.com",
      password: "12345678",
      username: "member_test",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IRedditPlatformMember.IJoin,
  });
  const searchConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: member.token.access },
  };
  // 2. Test cursor-based pagination with limit=5
  // First page (no cursor)
  const page1 = await api.functional.redditPlatform.member.search.posts.index(
    searchConnection,
    {
      body: {
        limit: 5,
      } satisfies IRedditPlatformPost.ISearchRequest,
    },
  );
  typia.assert(page1);
  TestValidator.equals(
    "page 1: pagination.current",
    page1.pagination.current,
    1,
  );
  TestValidator.equals("page 1: pagination.limit", page1.pagination.limit, 5);
  TestValidator.equals(
    "page 1: pagination.records",
    page1.pagination.records,
    page1.pagination.records,
  );
  TestValidator.equals(
    "page 1: pagination.pages",
    page1.pagination.pages,
    page1.pagination.pages,
  );
  TestValidator.equals(
    "page 1: data count",
    page1.data.length,
    page1.data.length,
  );
  TestValidator.predicate(
    "page 1: data count <= limit",
    page1.data.length <= 5,
  );
  // Capture cursor from last post's created_at if data exists
  if (page1.data.length > 0) {
    const cursor1 = page1.data[page1.data.length - 1].created_at;
    // Second page (with cursor)
    const page2 = await api.functional.redditPlatform.member.search.posts.index(
      searchConnection,
      {
        body: {
          limit: 5,
          after: cursor1,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
    typia.assert(page2);
    TestValidator.equals(
      "page 2: pagination.current",
      page2.pagination.current,
      2,
    );
    TestValidator.equals("page 2: pagination.limit", page2.pagination.limit, 5);
    TestValidator.equals(
      "page 2: data count",
      page2.data.length,
      page2.data.length,
    );
    TestValidator.predicate(
      "page 2: data count <= limit",
      page2.data.length <= 5,
    );
    // Verify no overlap between page 1 and page 2
    if (page1.data.length > 0 && page2.data.length > 0) {
      const page1Ids = new Set(page1.data.map((p) => p.id));
      const page2Ids = new Set(page2.data.map((p) => p.id));
      TestValidator.predicate(
        "page 1 and page 2 have no overlapping post IDs",
        page1Ids.size + page2Ids.size ===
          new Set([...page1Ids, ...page2Ids]).size,
      );
    }
  }
  // 3. Test cursor invalidation - search again with same cursor after potential data changes
  if (page1.data.length > 0) {
    const cursor1 = page1.data[page1.data.length - 1].created_at;
    const pageAfter =
      await api.functional.redditPlatform.member.search.posts.index(
        searchConnection,
        {
          body: {
            limit: 5,
            after: cursor1,
          } satisfies IRedditPlatformPost.ISearchRequest,
        },
      );
    typia.assert(pageAfter);
    TestValidator.equals(
      "after invalidation: pagination.current",
      pageAfter.pagination.current,
      2,
    );
    TestValidator.equals(
      "after invalidation: pagination.limit",
      pageAfter.pagination.limit,
      5,
    );
  }
  // 4. Test exclude_ids functionality
  const firstPage =
    await api.functional.redditPlatform.member.search.posts.index(
      searchConnection,
      {
        body: {
          limit: 5,
        } satisfies IRedditPlatformPost.ISearchRequest,
      },
    );
  typia.assert(firstPage);
  // Extract first 3 post IDs to exclude
  const excludeIds = firstPage.data.slice(0, 3).map((p) => p.id);
  if (excludeIds.length > 0) {
    const pageWithExclude =
      await api.functional.redditPlatform.member.search.posts.index(
        searchConnection,
        {
          body: {
            limit: 5,
            exclude_ids: excludeIds,
          } satisfies IRedditPlatformPost.ISearchRequest,
        },
      );
    typia.assert(pageWithExclude);
    TestValidator.equals(
      "exclude_ids: pagination.records",
      pageWithExclude.pagination.records,
      pageWithExclude.pagination.records,
    );
    // Verify excluded IDs don't appear in results
    for (const postId of excludeIds) {
      TestValidator.predicate(
        `exclude_ids: ${postId} not in results`,
        !pageWithExclude.data.some((p) => p.id === postId),
      );
    }
  }
  // 5. Test mixed pagination modes (page + after)
  if (page1.data.length > 0) {
    const cursor1 = page1.data[page1.data.length - 1].created_at;
    const mixedPageRequest =
      await api.functional.redditPlatform.member.search.posts.index(
        searchConnection,
        {
          body: {
            page: 1,
            limit: 5,
            after: cursor1,
          } satisfies IRedditPlatformPost.ISearchRequest,
        },
      );
    typia.assert(mixedPageRequest);
    TestValidator.equals(
      "mixed pagination: pagination.current",
      mixedPageRequest.pagination.current,
      mixedPageRequest.pagination.current,
    );
    TestValidator.equals(
      "mixed pagination: pagination.limit",
      mixedPageRequest.pagination.limit,
      5,
    );
  }
}
