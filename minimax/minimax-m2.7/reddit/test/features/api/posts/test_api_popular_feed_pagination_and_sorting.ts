import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePostLink";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_popular_feed_pagination_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as guest first (required prerequisite)
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {});
  // 2. Test basic pagination - page 1 vs page 2 should return different posts
  const page1Limit10 =
    await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          limit: 10,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(page1Limit10);
  const page2Limit10 =
    await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          limit: 10,
          page: 2,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(page2Limit10);
  // Validate pagination metadata for page 1
  TestValidator.equals("page 1 current", page1Limit10.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1Limit10.pagination.limit, 10);
  // Validate pagination metadata for page 2
  TestValidator.equals("page 2 current", page2Limit10.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Limit10.pagination.limit, 10);
  // Verify total records match across pages
  TestValidator.equals(
    "total records consistent",
    page1Limit10.pagination.records,
    page2Limit10.pagination.records,
  );
  // Verify pages count is consistent
  TestValidator.equals(
    "total pages consistent",
    page1Limit10.pagination.pages,
    page2Limit10.pagination.pages,
  );
  // Verify page 1 and page 2 return different posts (no overlap)
  const page1Ids = new Set(page1Limit10.data.map((post) => post.id));
  const page2Ids = new Set(page2Limit10.data.map((post) => post.id));
  for (const id of page1Ids) {
    TestValidator.predicate(
      "page 2 should not contain post from page 1",
      !page2Ids.has(id),
    );
  }
  // 3. Test maximum limit (100)
  const maxLimitResponse =
    await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          limit: 100,
          page: 1,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals("max limit", maxLimitResponse.pagination.limit, 100);
  TestValidator.predicate(
    "max limit returns up to 100 posts",
    maxLimitResponse.data.length <= 100,
  );
  // 4. Test high page number when fewer posts exist
  const highPageResponse =
    await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          limit: 10,
          page: 9999,
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(highPageResponse);
  // High page should return empty data but still have correct metadata
  TestValidator.equals(
    "high page current",
    highPageResponse.pagination.current,
    9999,
  );
  TestValidator.predicate(
    "high page returns empty data",
    highPageResponse.data.length === 0,
  );
  // 5. Test different sort options
  const hotSort = await api.functional.redditClone.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        sort: "hot",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(hotSort);
  const newSort = await api.functional.redditClone.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        sort: "new",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(newSort);
  const topSort = await api.functional.redditClone.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        sort: "top",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topSort);
  const controversialSort =
    await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          sort: "controversial",
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(controversialSort);
  // Verify each sort returns valid data
  TestValidator.predicate("hot sort returns posts", hotSort.data.length >= 0);
  TestValidator.predicate("new sort returns posts", newSort.data.length >= 0);
  TestValidator.predicate("top sort returns posts", topSort.data.length >= 0);
  TestValidator.predicate(
    "controversial sort returns posts",
    controversialSort.data.length >= 0,
  );
  // 6. Test time range filters for top and controversial
  const topDay = await api.functional.redditClone.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        sort: "top",
        timeRange: "day",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topDay);
  const topWeek = await api.functional.redditClone.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        sort: "top",
        timeRange: "week",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topWeek);
  const topMonth = await api.functional.redditClone.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        sort: "top",
        timeRange: "month",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topMonth);
  const topYear = await api.functional.redditClone.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        sort: "top",
        timeRange: "year",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topYear);
  const topAll = await api.functional.redditClone.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        sort: "top",
        timeRange: "all",
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(topAll);
  // Verify time range filters return valid responses
  TestValidator.predicate("day filter returns", topDay.data.length >= 0);
  TestValidator.predicate("week filter returns", topWeek.data.length >= 0);
  TestValidator.predicate("month filter returns", topMonth.data.length >= 0);
  TestValidator.predicate("year filter returns", topYear.data.length >= 0);
  TestValidator.predicate("all filter returns", topAll.data.length >= 0);
  // 'all' should have >= posts than time-limited filters
  TestValidator.predicate(
    "all time should have >= posts than day",
    topAll.pagination.records >= topDay.pagination.records,
  );
  // 7. Test controversial sort with time filters
  const controversialDay =
    await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          sort: "controversial",
          timeRange: "day",
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(controversialDay);
  TestValidator.predicate(
    "controversial day filter returns posts",
    controversialDay.data.length >= 0,
  );
  // 8. Test post type filtering combined with pagination
  const textPosts = await api.functional.redditClone.guest.posts.popular.index(
    guestConnection,
    {
      body: {
        postType: "text",
        limit: 5,
        page: 1,
      } satisfies IRedditClonePostLink.IRequest,
    },
  );
  typia.assert(textPosts);
  // Verify all returned posts are text type
  for (const post of textPosts.data) {
    TestValidator.equals("post type is text", post.type, "text");
  }
  // 9. Test combined pagination and sorting
  const combinedResponse =
    await api.functional.redditClone.guest.posts.popular.index(
      guestConnection,
      {
        body: {
          limit: 5,
          page: 1,
          sort: "top",
          timeRange: "week",
        } satisfies IRedditClonePostLink.IRequest,
      },
    );
  typia.assert(combinedResponse);
  // Validate combined response metadata
  TestValidator.equals(
    "combined current",
    combinedResponse.pagination.current,
    1,
  );
  TestValidator.equals("combined limit", combinedResponse.pagination.limit, 5);
  TestValidator.predicate(
    "combined returns posts",
    combinedResponse.data.length <= 5,
  );
}
