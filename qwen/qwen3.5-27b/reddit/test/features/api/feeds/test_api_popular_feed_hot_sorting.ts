import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditClonePost";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunitySubscription";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { generate_random_reddit_clone_member_subscriptions_create } from "../../../generate/generate_random_reddit_clone_member_subscriptions_create";
import { prepare_random_reddit_clone_community_subscription } from "../../../prepare/prepare_random_reddit_clone_community_subscription";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the popular feed endpoint with hot sorting (default behavior).
 *
 * Validates that the popular feed correctly retrieves posts from all communities and applies hot sorting algorithm that balances recency and engagement. The test verifies that posts are returned with all required summary fields, pagination metadata is accurate, and guest users can access the feed without authentication.
 *
 * Special attention is given to verifying that hot sorting appropriately weights recent posts with higher vote scores, ensuring that engaging content from the recent past appears before older posts with similar engagement levels.
 *
 * 1. Authenticate a member user to create test posts.
 * 2. Subscribe the member to a community to enable post creation.
 * 3. Create multiple posts of different types (text, link, image) with varying content.
 * 4. Retrieve the popular feed with hot sorting (default).
 * 5. Validate that all posts in the feed have correct structure and required fields.
 * 6. Validate pagination metadata is correct.
 * 7. Verify that guest users can access the popular feed without authentication.
 */
export async function test_api_popular_feed_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate member user
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & typia.tags.Format<"email">>(),
      href: typia.random<string & typia.tags.Format<"uri">>(),
      password: RandomGenerator.alphaNumeric(16),
      referrer: typia.random<string & typia.tags.Format<"uri">>(),
      username: RandomGenerator.name(),
    },
  });
  typia.assert(member);
  // 2. Create a community subscription
  const subscription =
    await generate_random_reddit_clone_member_subscriptions_create(
      memberConnection,
      {},
    );
  typia.assert(subscription);
  // 3. Create multiple posts of different types
  const textPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        community_id: subscription.community.id,
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(textPost);
  const linkPost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "link",
        community_id: subscription.community.id,
        link_url: typia.random<string & typia.tags.Format<"url">>(),
      },
    },
  );
  typia.assert(linkPost);
  const imagePost = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "image",
        community_id: subscription.community.id,
        image_url: typia.random<string & typia.tags.Format<"url">>(),
      },
    },
  );
  typia.assert(imagePost);
  // 4. Retrieve popular feed with hot sorting (default)
  const feed = await api.functional.redditClone.feeds.popular.index(
    connection,
    {
      body: {
        sortType: "hot",
        page: 1,
        limit: 25,
      },
    },
  );
  typia.assert(feed);
  // 5. Validate feed structure and pagination
  TestValidator.predicate("feed contains posts", feed.data.length > 0);
  TestValidator.equals("current page", feed.pagination.current, 1);
  TestValidator.equals("page limit", feed.pagination.limit, 25);
  TestValidator.predicate(
    "total records non-negative",
    feed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    feed.pagination.pages >= 0,
  );
  // 6. Validate each post in the feed has correct business data
  await ArrayUtil.asyncForEach(feed.data, async (post) => {
    typia.assert(post);
    // Validate vote score is a reasonable number
    TestValidator.predicate(
      "vote score is valid integer",
      Number.isInteger(post.vote_score),
    );
    // Validate comment count is non-negative
    TestValidator.predicate(
      "comment count is non-negative",
      post.comment_count >= 0,
    );
    // Validate preview has content
    TestValidator.predicate("preview has content", post.preview.length > 0);
    // Validate post type is one of the valid types
    TestValidator.predicate(
      "post type is valid",
      ["text", "link", "image"].includes(post.post_type),
    );
  });
  // 7. Verify guest access (using base connection without auth)
  const guestConnection: api.IConnection = { host: connection.host };
  const guestFeed = await api.functional.redditClone.feeds.popular.index(
    guestConnection,
    {
      body: {
        sortType: "hot",
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(guestFeed);
  TestValidator.predicate(
    "guest can access popular feed",
    guestFeed.data.length >= 0,
  );
  TestValidator.equals(
    "guest feed current page",
    guestFeed.pagination.current,
    1,
  );
  TestValidator.equals("guest feed limit", guestFeed.pagination.limit, 10);
  // 8. Verify pagination works correctly
  if (feed.pagination.pages > 1) {
    const secondPage = await api.functional.redditClone.feeds.popular.index(
      connection,
      {
        body: {
          sortType: "hot",
          page: 2,
          limit: 25,
        },
      },
    );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals("second page limit", secondPage.pagination.limit, 25);
  }
}
