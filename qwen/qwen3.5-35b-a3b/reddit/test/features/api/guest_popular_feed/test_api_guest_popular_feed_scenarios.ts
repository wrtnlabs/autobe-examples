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

export async function test_api_guest_popular_feed_scenarios(
  connection: api.IConnection,
): Promise<void> {
  // 1. Primary Success - Hot Sort
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAccount = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() as string & tags.Format<"uri">,
      bio: null,
      avatar_url: null,
    } satisfies IRedditPlatformGuest.IJoin,
  });
  typia.assert(guestAccount);
  // Request popular feed with hot sort (default)
  const hotFeed =
    await api.functional.redditPlatform.guest.posts.feed.popular.index(
      guestConnection,
      {
        body: {
          sortBy: "hot",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(hotFeed);
  // Validate pagination structure
  TestValidator.equals(
    "hot feed pagination current",
    hotFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "hot feed pagination limit",
    hotFeed.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "hot feed pagination records >= 0",
    () => hotFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "hot feed pagination pages >= 0",
    () => hotFeed.pagination.pages >= 0,
  );
  // Validate post structure if data exists
  if (hotFeed.data.length > 0) {
    const firstPost = hotFeed.data[0];
    typia.assert(firstPost);
    // Validate required post fields
    TestValidator.notEquals("post has id", firstPost.id, null);
    TestValidator.notEquals("post has title", firstPost.title, null);
    TestValidator.predicate("post has valid post_type", () =>
      ["TEXT", "LINK", "IMAGE"].includes(firstPost.post_type),
    );
    TestValidator.predicate(
      "post has valid vote_score",
      () => typeof firstPost.vote_score === "number",
    );
    TestValidator.predicate(
      "post has valid comment_count",
      () => typeof firstPost.comment_count === "number",
    );
    // Validate author fields
    TestValidator.notEquals(
      "author has username",
      firstPost.author.username,
      null,
    );
    TestValidator.notEquals(
      "author has display_name",
      firstPost.author.display_name,
      null,
    );
    TestValidator.predicate(
      "author has valid karma_score",
      () => typeof firstPost.author.karma_score === "number",
    );
    // Validate community fields
    TestValidator.notEquals(
      "community has name",
      firstPost.community.name,
      null,
    );
    TestValidator.predicate(
      "community has valid subscriber_count",
      () => typeof firstPost.community.subscriber_count === "number",
    );
  }
  // 2. Business Logic - Top Sort with Time Range
  const topFeed =
    await api.functional.redditPlatform.guest.posts.feed.popular.index(
      guestConnection,
      {
        body: {
          sortBy: "top",
          timeRange: "this_week",
          page: 1,
          limit: 20,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(topFeed);
  // Validate top feed pagination
  TestValidator.equals(
    "top feed pagination current",
    topFeed.pagination.current,
    1,
  );
  TestValidator.equals(
    "top feed pagination limit",
    topFeed.pagination.limit,
    20,
  );
  // Validate sorting order if data exists
  if (topFeed.data.length > 0) {
    // Verify posts are sorted by vote_score in descending order
    for (let i = 0; i < topFeed.data.length - 1; i++) {
      const currentScore = topFeed.data[i].vote_score;
      const nextScore = topFeed.data[i + 1].vote_score;
      TestValidator.predicate(
        `top feed post ${i} has higher or equal score than post ${i + 1}`,
        () => currentScore >= nextScore,
      );
    }
  }
  // 3. Edge Case - Empty Feed
  // Request popular feed with high limit to ensure empty scenario validation
  const emptyFeed =
    await api.functional.redditPlatform.guest.posts.feed.popular.index(
      guestConnection,
      {
        body: {
          page: 999,
          limit: 1,
        } satisfies IRedditPlatformPost.IRequest,
      },
    );
  typia.assert(emptyFeed);
  // Validate empty feed response structure
  TestValidator.equals("empty feed data array", emptyFeed.data, []);
  TestValidator.equals(
    "empty feed pagination current",
    emptyFeed.pagination.current,
    999,
  );
  TestValidator.equals(
    "empty feed pagination limit",
    emptyFeed.pagination.limit,
    1,
  );
  TestValidator.equals(
    "empty feed pagination records",
    emptyFeed.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty feed pagination pages",
    emptyFeed.pagination.pages,
    0,
  );
}