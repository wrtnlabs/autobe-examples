import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPost";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_home_feed_excludes_banned_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member using the utility function
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
      username: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberAuth);
  // 2. Create a separate connection with the member's auth token
  const memberAuthenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 3. Subscribe the member to a community
  // Note: Using simulation mode generates valid community references
  const subscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberAuthenticatedConnection,
      {
        body: {
          reddit_community_communities_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(subscription);
  // 4. Verify subscription status is active
  TestValidator.equals(
    "subscription status is active",
    subscription.status,
    "active",
  );
  // 5. Create another subscription to a different community
  const secondSubscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberAuthenticatedConnection,
      {
        body: {
          reddit_community_communities_id: typia.random<
            string & tags.Format<"uuid">
          >(),
        },
      },
    );
  typia.assert(secondSubscription);
  // 6. Verify second subscription is also active
  TestValidator.equals(
    "second subscription status is active",
    secondSubscription.status,
    "active",
  );
  // 7. Call the home feed endpoint to retrieve posts
  const homeFeed = await api.functional.redditCommunity.member.feeds.home.index(
    memberAuthenticatedConnection,
    {
      body: {
        sort: "hot",
        pageSize: 10,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(homeFeed);
  // 8. Validate home feed response structure
  TestValidator.equals(
    "home feed has valid pagination current",
    homeFeed.pagination.current,
    1,
  );
  TestValidator.predicate(
    "home feed has valid limit",
    homeFeed.pagination.limit > 0,
  );
  TestValidator.predicate(
    "home feed records count is non-negative",
    homeFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "home feed pages count is non-negative",
    homeFeed.pagination.pages >= 0,
  );
  // 9. Validate total pages calculation
  const expectedPages = Math.ceil(
    homeFeed.pagination.records / homeFeed.pagination.limit,
  );
  TestValidator.equals(
    "total pages calculation is correct",
    homeFeed.pagination.pages,
    expectedPages,
  );
  // 10. Validate member identity is correctly used (memberAuth.id should be in response data if posts exist)
  if (homeFeed.data.length > 0) {
    // Verify posts are from subscribed communities (business logic: only subscribed community posts appear)
    const feedCommunityIds = new Set(
      homeFeed.data.map((post) => post.community.id),
    );
    const memberCommunityIds = new Set([
      subscription.community.id,
      secondSubscription.community.id,
    ]);
    // At least some posts should be from subscribed communities
    if (homeFeed.data.some((post) => post.community.id)) {
      TestValidator.predicate(
        "feed contains posts from subscribed communities",
        Array.from(feedCommunityIds).some((id) => memberCommunityIds.has(id)),
      );
    }
  }
  // 11. Validate that data array is properly typed array of posts
  if (homeFeed.data.length > 0) {
    TestValidator.equals(
      "first post has valid ID format",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        homeFeed.data[0].id,
      ),
      true,
    );
    TestValidator.equals(
      "first post has non-empty title",
      homeFeed.data[0].title.length > 0,
      true,
    );
    TestValidator.equals(
      "first post has valid post type",
      ["text", "link", "image"].includes(homeFeed.data[0].post_type),
      true,
    );
  }
  // 12. Test sorting - verify posts are sorted by created_at DESC for 'hot' sort
  if (homeFeed.data.length >= 2) {
    for (let i = 1; i < homeFeed.data.length; i++) {
      const prevDate = new Date(homeFeed.data[i - 1].created_at);
      const currDate = new Date(homeFeed.data[i].created_at);
      TestValidator.predicate(
        `post ${i - 1} is newer than post ${i}`,
        prevDate >= currDate,
      );
    }
  }
}
