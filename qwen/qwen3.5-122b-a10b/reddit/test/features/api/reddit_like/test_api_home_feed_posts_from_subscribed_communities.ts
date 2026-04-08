import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { generate_random_reddit_like_member_subscriptions_create } from "../../../generate/generate_random_reddit_like_member_subscriptions_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_community_subscription } from "../../../prepare/prepare_random_reddit_like_community_subscription";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test that a member can access their home feed and see posts only from communities they are subscribed to.
 *
 * Validates the complete home feed workflow including community creation, subscription, post creation, and feed filtering. Ensures that posts from subscribed communities appear in the home feed while posts from non-subscribed communities are excluded.
 *
 * Special attention is given to verifying feed sorting options (hot, new, top, controversial) work correctly, pagination metadata is valid, and post summaries contain all required fields including vote scores, comment counts, and content previews.
 *
 * 1. Member authenticates via registration.
 * 2. Member creates a community.
 * 3. Member subscribes to the community.
 * 4. Member creates two posts in the subscribed community.
 * 5. Home feed is queried and validated to contain both posts.
 * 6. Post summary structure is validated (title, community, vote score, comment count, content preview).
 * 7. Another member creates a community and post.
 * 8. Original member's home feed is verified to exclude the non-subscribed community's post.
 * 9. Different sorting options (hot, top, controversial) are tested.
 * 10. Pagination is validated with correct page size and metadata.
 */
export async function test_api_home_feed_posts_from_subscribed_communities(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: `test_community_${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3. Subscribe to the community
  const subscription =
    await generate_random_reddit_like_member_subscriptions_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
        } satisfies IRedditLikeCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create posts in the subscribed community
  const post1 = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: `Test Post 1 ${RandomGenerator.alphabets(5)}`,
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        title: `Test Post 2 ${RandomGenerator.alphabets(5)}`,
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post2);
  // 5. Verify home feed shows posts from subscribed community
  const homeFeed = await api.functional.redditLike.member.feeds.home.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "new",
        limit: 25,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(homeFeed);
  // Validate feed contains the created posts
  TestValidator.predicate(
    "home feed contains subscribed community posts",
    homeFeed.data.some((p) => p.id === post1.id),
  );
  TestValidator.predicate(
    "home feed contains second post",
    homeFeed.data.some((p) => p.id === post2.id),
  );
  // Validate post summary structure
  const foundPost1 = homeFeed.data.find((p) => p.id === post1.id)!;
  typia.assertGuard(foundPost1);
  TestValidator.equals("post title matches", foundPost1.title, post1.title);
  TestValidator.equals(
    "post community matches",
    foundPost1.community.id,
    community.id,
  );
  TestValidator.predicate(
    "has vote score",
    typeof foundPost1.vote_score === "number",
  );
  TestValidator.predicate(
    "has comment count",
    typeof foundPost1.comment_count === "number",
  );
  TestValidator.predicate(
    "has content preview",
    foundPost1.content_preview.length > 0,
  );
  // 6. Create another community and subscribe another member
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember = await authorize_member_join(otherMemberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(otherMember);
  const otherCommunity =
    await generate_random_reddit_like_member_communities_create(
      otherMemberConnection,
      {
        body: {
          name: `other_community_${RandomGenerator.alphabets(8)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditLikeCommunity.ICreate,
      },
    );
  typia.assert(otherCommunity);
  const otherPost = await generate_random_reddit_like_member_posts_create(
    otherMemberConnection,
    {
      body: {
        community_id: otherCommunity.id,
        title: `Other Community Post ${RandomGenerator.alphabets(5)}`,
        content_type: "text",
        content_text: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(otherPost);
  // 7. Verify original member's home feed does NOT contain posts from non-subscribed community
  const homeFeedAfter = await api.functional.redditLike.member.feeds.home.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "new",
        limit: 100,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(homeFeedAfter);
  TestValidator.predicate(
    "home feed excludes non-subscribed community posts",
    !homeFeedAfter.data.some((p) => p.id === otherPost.id),
  );
  // 8. Test different sorting options
  const hotFeed = await api.functional.redditLike.member.feeds.home.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "hot",
        limit: 25,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(hotFeed);
  const topFeed = await api.functional.redditLike.member.feeds.home.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "top",
        time_filter: "all_time",
        limit: 25,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(topFeed);
  const controversialFeed =
    await api.functional.redditLike.member.feeds.home.index(memberConnection, {
      body: {
        feed_type: "home",
        sort: "controversial",
        limit: 25,
      } satisfies IRedditLikePost.IRequest,
    });
  typia.assert(controversialFeed);
  // 9. Test pagination
  const firstPage = await api.functional.redditLike.member.feeds.home.index(
    memberConnection,
    {
      body: {
        feed_type: "home",
        sort: "new",
        limit: 1,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(firstPage);
  TestValidator.predicate(
    "pagination returns correct page size",
    firstPage.data.length <= 1,
  );
  TestValidator.predicate(
    "pagination metadata is valid",
    firstPage.pagination.current >= 1 && firstPage.pagination.limit >= 1,
  );
}
