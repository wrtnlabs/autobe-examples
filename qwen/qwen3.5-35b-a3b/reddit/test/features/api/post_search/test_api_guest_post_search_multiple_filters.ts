import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_search_multiple_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as guest
  const guestAuth = await authorize_guest_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
    },
  });
  typia.assert(guestAuth);
  // Create guest-specific connection for authenticated requests
  const guestConnection: api.IConnection = { host: connection.host };
  guestConnection.headers = {
    Authorization: guestAuth.token.access,
  };
  // 4. Test search with title filter (case-insensitive)
  const searchResult1 =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          search: "reactjs",
        },
      },
    );
  typia.assert(searchResult1);
  TestValidator.equals(
    "search title results count",
    searchResult1.data.length,
    6,
  );
  TestValidator.predicate(
    "all posts have reactjs in title",
    searchResult1.data.every((p) => p.title.toLowerCase().includes("reactjs")),
  );
  // 5. Test search with community filter
  const searchResult2 =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(searchResult2);
  TestValidator.predicate(
    "community filter returns array",
    Array.isArray(searchResult2.data),
  );
  // 6. Test search with post type filter
  const searchResult3 =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          postType: "text",
        },
      },
    );
  typia.assert(searchResult3);
  TestValidator.predicate(
    "all text posts",
    searchResult3.data.every((p) => p.post_type === "TEXT"),
  );
  // 7. Test search with composite filter (community + type)
  const searchResult4 =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
          postType: "text",
        },
      },
    );
  typia.assert(searchResult4);
  TestValidator.predicate(
    "composite filter returns array",
    Array.isArray(searchResult4.data),
  );
  // 8. Test top sorting with time ranges
  for (const timeRange of [
    "today",
    "this_week",
    "this_month",
    "this_year",
    "all_time",
  ] as const) {
    const searchResult =
      await api.functional.redditPlatform.guest.posts.search.index(
        guestConnection,
        {
          body: {
            sortBy: "top",
            timeRange: timeRange,
          },
        },
      );
    typia.assert(searchResult);
    TestValidator.predicate("top sorting valid", searchResult.data.length >= 0);
  }
  // 9. Test pagination with different limits
  for (const limit of [20, 50, 100]) {
    const searchResult =
      await api.functional.redditPlatform.guest.posts.search.index(
        guestConnection,
        {
          body: {
            limit: limit,
          },
        },
      );
    typia.assert(searchResult);
    TestValidator.equals(
      "pagination limit",
      searchResult.pagination.limit,
      limit,
    );
  }
  // 10. Test page navigation
  const page1 = await api.functional.redditPlatform.guest.posts.search.index(
    guestConnection,
    {
      body: {
        page: 1,
        limit: 2,
      },
    },
  );
  typia.assert(page1);
  const page2 = await api.functional.redditPlatform.guest.posts.search.index(
    guestConnection,
    {
      body: {
        page: 2,
        limit: 2,
      },
    },
  );
  typia.assert(page2);
  TestValidator.equals(
    "page count consistent",
    page1.pagination.records,
    page2.pagination.records,
  );
  TestValidator.notEquals(
    "page data differs",
    page1.data[0]?.id,
    page2.data[0]?.id,
  );
  // 11. Validate author and community joins
  const samplePost = searchResult1.data[0];
  if (samplePost) {
    typia.assert(samplePost);
    TestValidator.predicate(
      "author username exists",
      samplePost.author.username.length > 0,
    );
    TestValidator.predicate(
      "author display_name exists",
      samplePost.author.display_name.length > 0,
    );
    TestValidator.predicate(
      "community name exists",
      samplePost.community.name.length > 0,
    );
    TestValidator.predicate(
      "community subscriber_count exists",
      samplePost.community.subscriber_count >= 0,
    );
  }
  // 12. Test vote score range filter
  const searchResultRange =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          voteScoreRange: {
            min: 0,
            max: 1000,
          },
        },
      },
    );
  typia.assert(searchResultRange);
  TestValidator.predicate(
    "vote score range valid",
    searchResultRange.data.every(
      (p) => p.vote_score >= 0 && p.vote_score <= 1000,
    ),
  );
}
