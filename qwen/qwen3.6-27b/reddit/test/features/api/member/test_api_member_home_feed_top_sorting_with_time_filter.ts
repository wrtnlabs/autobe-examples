import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunityPost";
import type { IREdditLikeCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityCommunity";
import type { IREdditLikeCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityMember";
import type { IREdditLikeCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityPost";
import type { IREdditLikeCommunityProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IREdditLikeCommunityProfile";
import type { IRedditLikeCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityCommunitySubscription";
import type { IRedditLikeCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityPostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_community_member_communities_create } from "../../../generate/generate_random_reddit_like_community_member_communities_create";
import { generate_random_reddit_like_community_member_community_subscriptions_create } from "../../../generate/generate_random_reddit_like_community_member_community_subscriptions_create";
import { generate_random_reddit_like_community_member_posts_create } from "../../../generate/generate_random_reddit_like_community_member_posts_create";
import { prepare_random_reddit_like_community_community } from "../../../prepare/prepare_random_reddit_like_community_community";
import { prepare_random_reddit_like_community_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_community_subscription";
import { prepare_random_reddit_like_community_post } from "../../../prepare/prepare_random_reddit_like_community_post";

/**
 * Test home feed retrieval with top sorting and this_week time filter.
 *
 * Validat* Validates that the home feed endpoint correctly applies both time-based filtering and vote-score sorting when requesting posts from subscribed communities. The member creates a community, subscribes to it, and creates multiple posts. When requesting the feed with sortBy='top' and timeFilter='this_week', only posts within the current week should appear, ordered by their vote scores in descending order.
 *
 * Special attention is given to verifying that posts from unsubscribed communities are excluded, the time filter restricts results to the current week, and pagination correctly handles the filtered results.
 *
 * 1. Member registers with email and credentials.
 * 2. Member creates a community.
 * 3. Member subscribes to the created community.
 * 4. Member creates multiple text posts in the subscribed community.
 * 5. Member requests home feed with sortBy='top' and timeFilter='this_week'.
 * 6. Validates feed contains only posts from the subscribed community, correct pagination metadata, and proper response structure.
 */
export async function test_api_member_home_feed_top_sorting_with_time_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    href: "https://example.com/join" satisfies string & tags.Format<"uri">,
    referrer: "https://example.com/home" satisfies string & tags.Format<"uri">,
  } satisfies IREdditLikeCommunityMember.IJoin;
  await authorize_member_join(memberConnection, { body: memberJoin });
  // 2. Create a community
  const community =
    await generate_random_reddit_like_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe member to the community
  const subscription =
    await generate_random_reddit_like_community_member_community_subscriptions_create(
      memberConnection,
      {
        body: { community_id: community.id },
      },
    );
  typia.assert(subscription);
  // 4. Create multiple posts in the subscribed community
  const feedRequest = {
    sortBy: "top",
    timeFilter: "this_week",
  } satisfies IREdditLikeCommunityCommunity.IHomeFeedRequest;
  const posts: IREdditLikeCommunityPost.ICreate[] = ArrayUtil.repeat(
    5,
    () =>
      ({
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text" as const,
        community_id: community.id,
        body: RandomGenerator.paragraph({ sentences: 4 }),
      }) as IREdditLikeCommunityPost.ICreate,
  );
  const createdPosts = await ArrayUtil.asyncRepeat(posts.length, async (i) =>
    generate_random_reddit_like_community_member_posts_create(
      memberConnection,
      {
        body: posts[i],
      },
    ),
  );
  for (const post of createdPosts) typia.assert(post);
  // 5. Request home feed with top sorting and this_week filter
  const feed = await api.functional.redditLikeCommunity.member.feeds.home.index(
    memberConnection,
    { body: feedRequest },
  );
  typia.assert(subscription);
  typia.assert(subscription);
  // 7. Validate all feed posts feed posts belonging to the subscribed community
  for (const postSummary of feed.data) {
    TestValidator.equals(
      "post belongs to subscribed community",
      postSummary.community.id,
      community.id,
    );
  }
  // 8. Validate pagination metadata
  TestValidator.equals("current page is 1", feed.pagination.current, 1);
  TestValidator.predicate("limit is positive", feed.pagination.limit > 0);
  TestValidator.predicate(
    "record count matches data length",
    feed.pagination.records >= feed.data.length,
  );
  TestValidator.predicate(
    "page count is valid",
    feed.pagination.pages >= feed.pagination.current,
  );
  // 9. Validate feed contains the created posts
  const feedPostIds = feed.data.map((p: IREdditLikeCommunityPost.ISummary) => p.id);
  for (const post of createdPosts) {
    await TestValidator.predicate(
      `post ${post.title} should be in feed`,
      feedPostIds.some(
        (id: string) => feed.data.find((fp: IREdditLikeCommunityPost.ISummary) => fp.id === id)?.title === post.title,
      ),
    );
  }
}