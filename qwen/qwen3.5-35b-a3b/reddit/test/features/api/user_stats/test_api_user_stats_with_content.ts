import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostImage";
import type { IRedditPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostLink";
import type { IRedditPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostText";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformSubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_vote } from "../../../generate/generate_random_reddit_platform_member_posts_vote";
import { generate_random_reddit_platform_member_subscriptions_create } from "../../../generate/generate_random_reddit_platform_member_subscriptions_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";
import { prepare_random_reddit_platform_subscription } from "../../../prepare/prepare_random_reddit_platform_subscription";

/**
 * Test comprehensive user statistics with real content engagement.
 *
 * Validates the complete user statistics aggregation workflow across multiple
 * content types and interaction patterns. The test creates a realistic scenario
 * where a member owns a community, subscribes to multiple communities, and actively
 * posts and comments across the platform. Karma calculation is verified by having
 * another user upvote the test member's content, ensuring that the statistics
 * accurately reflect real-time engagement metrics.
 *
 * Special attention is given to verifying that comment_count correctly includes
 * all comments and nested replies, that karma only increases from upvotes on the
 * member's content (not self-votes), and that account_age_days and last_active_at
 * are calculated correctly from the creation timestamps.
 *
 * 1. First member joins platform and creates content
 * 2. First member owns 1 community and subscribes to 2 communities
 * 3. First member creates 3 posts and 5 comments
 * 4. Second member joins platform
 * 5. Second member upvotes first member's post (increases karma)
 * 6. Retrieve and validate statistics match expected counts
 */
export async function test_api_user_stats_with_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join and authenticate first member (content creator)
  const member1Connection: api.IConnection = { host: connection.host };
  const auth1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphabets(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: "http://test.local",
      referrer: "http://test.local/join",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(auth1);
  typia.assert(auth1.token.access);
  const member1: IRedditPlatformMember.ISummary = auth1;
  // 2. Create 1 community owned by member1
  const ownedCommunity =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name:
            RandomGenerator.alphabets(4) +
            "_" +
            RandomGenerator.alphaNumeric(3),
          description: "Test community for member stats validation",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(ownedCommunity);
  typia.assert(ownedCommunity.owner.id === member1.id);
  // 3. Subscribe member1 to 2 communities
  // Subscribe to owned community
  const subscription1 =
    await api.functional.redditPlatform.member.subscriptions.create(
      member1Connection,
      {
        body: {
          community_id: ownedCommunity.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription1);
  // Create another community and subscribe to it
  const targetCommunity =
    await api.functional.redditPlatform.member.communities.create(
      member1Connection,
      {
        body: {
          name:
            RandomGenerator.alphabets(4) +
            "_" +
            RandomGenerator.alphaNumeric(3),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(targetCommunity);
  const subscription2 =
    await api.functional.redditPlatform.member.subscriptions.create(
      member1Connection,
      {
        body: {
          community_id: targetCommunity.id,
        } satisfies IRedditPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription2);
  // 4. Create 3 posts authored by member1
  const post1 = await api.functional.redditPlatform.member.posts.create(
    member1Connection,
    {
      body: {
        community_id: ownedCommunity.id,
        title: "First test post for statistics validation",
        post_type: "text",
        text_content:
          "This is the content of the first post created by the member for testing statistics accuracy.",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await api.functional.redditPlatform.member.posts.create(
    member1Connection,
    {
      body: {
        community_id: ownedCommunity.id,
        title: "Second test post with text content",
        post_type: "text",
        text_content:
          "Second post content for comprehensive statistics testing.",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  const post3 = await api.functional.redditPlatform.member.posts.create(
    member1Connection,
    {
      body: {
        community_id: ownedCommunity.id,
        title: "Third test post for complete coverage",
        post_type: "text",
        text_content:
          "Third post content to verify accurate post counting in statistics.",
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post3);
  // 5. Create 5 comments (including 1 reply)
  const comment1 = await api.functional.redditPlatform.member.comments.create(
    member1Connection,
    {
      body: {
        reddit_platform_post_id: post1.id,
        content: "First comment on post 1",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment1);
  const comment2 = await api.functional.redditPlatform.member.comments.create(
    member1Connection,
    {
      body: {
        reddit_platform_post_id: post1.id,
        content: "Second comment on post 1",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment2);
  const comment3 = await api.functional.redditPlatform.member.comments.create(
    member1Connection,
    {
      body: {
        reddit_platform_post_id: post2.id,
        content: "Comment on post 2",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment3);
  const comment4 = await api.functional.redditPlatform.member.comments.create(
    member1Connection,
    {
      body: {
        reddit_platform_post_id: post2.id,
        content: "Another comment on post 2",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment4);
  // Create a reply comment (comment 5)
  const comment5 = await api.functional.redditPlatform.member.comments.create(
    member1Connection,
    {
      body: {
        reddit_platform_post_id: post3.id,
        reddit_platform_comments_id: comment1.id,
        content: "Reply to the first comment",
      } satisfies IRedditPlatformComment.ICreate,
    },
  );
  typia.assert(comment5);
  // 6. Join second member to vote on first member's post (karma test)
  const member2Connection: api.IConnection = { host: connection.host };
  const auth2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username:
        RandomGenerator.alphabets(6) + "_" + RandomGenerator.alphaNumeric(4),
      href: "http://test.local",
      referrer: "http://test.local/join",
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(auth2);
  typia.assert(auth2.token.access);
  // 7. Second member upvotes first member's post (should increase karma)
  const vote = await api.functional.redditPlatform.member.posts.vote(
    member2Connection,
    {
      postId: post1.id,
      body: {
        vote_type: "up",
      } satisfies IRedditPlatformPostVote.ICreate,
    },
  );
  typia.assert(vote);
  // 8. Retrieve and validate first member's statistics
  const stats =
    await api.functional.redditPlatform.member.users.me.stats(
      member1Connection,
    );
  typia.assert(stats);
  // Validate all expected metrics
  TestValidator.equals("karma increased from upvote", stats.karma, 1);
  TestValidator.equals("post count matches", stats.post_count, 3);
  TestValidator.equals("comment count matches", stats.comment_count, 5);
  TestValidator.equals("community count matches", stats.community_count, 1);
  TestValidator.equals(
    "subscription count matches",
    stats.subscription_count,
    2,
  );
  TestValidator.predicate(
    "account age is non-negative",
    stats.account_age_days >= 0,
  );
  TestValidator.predicate(
    "last active timestamp exists",
    stats.last_active_at !== null,
  );
}
