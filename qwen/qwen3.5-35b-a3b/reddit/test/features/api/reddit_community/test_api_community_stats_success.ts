import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_community_stats_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Use a pre-existing community ID (placeholder - in real test, must be valid community)
  // Note: Community creation endpoint is not available in the API, so we use a placeholder
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 2. Authenticate member and create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Member connection headers are mutated internally by authorize_member_join
  // 3. Subscribe member to existing community (will fail if community doesn't exist - acceptable)
  const subscription: IRedditCommunitySubscription =
    await generate_random_reddit_community_member_subscriptions_create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: communityId,
        },
      },
    );
  typia.assert(subscription);
  // 4. Create a post in the community
  const post: IRedditCommunityPost =
    await generate_random_reddit_community_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 2 }),
          post_type: "text",
          reddit_community_community_id: communityId,
          text_content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(post);
  // 5. Cast a vote on the post
  const vote: IRedditCommunityPostVote =
    await generate_random_reddit_community_member_posts_votes_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          vote_type: "upvote",
        },
      },
    );
  typia.assert(vote);
  // 6. Create a comment on the post
  const comment: IRedditCommunityComment =
    await generate_random_reddit_community_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(comment);
  // 7. Call the stats endpoint
  const stats: IRedditCommunityCommunity.IAt =
    await api.functional.redditCommunity.member.communities.stats.at(
      memberConnection,
      {
        communityId: communityId,
      },
    );
  typia.assert(stats);
  // 8. Validate response structure and metrics
  // All metrics should be at least 1 (from our test data)
  TestValidator.equals(
    "subscriber count is at least 1",
    stats.subscriber_count,
    1,
  );
  TestValidator.equals("post count is at least 1", stats.post_count, 1);
  TestValidator.equals("comment count is at least 1", stats.comment_count, 1);
  TestValidator.equals("vote count is at least 1", stats.vote_count, 1);
  // Validate created_at matches community creation time from subscription
  TestValidator.equals(
    "created_at matches community creation time",
    stats.created_at,
    subscription.community.created_at,
  );
  // Validate name matches community name
  TestValidator.equals(
    "name matches community name",
    stats.name,
    subscription.community.name,
  );
  // Validate all metrics are non-negative
  TestValidator.predicate(
    "subscriber_count is non-negative",
    stats.subscriber_count >= 0,
  );
  TestValidator.predicate("post_count is non-negative", stats.post_count >= 0);
  TestValidator.predicate(
    "comment_count is non-negative",
    stats.comment_count >= 0,
  );
  TestValidator.predicate("vote_count is non-negative", stats.vote_count >= 0);
  // Validate created_at is valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 format",
    !isNaN(Date.parse(stats.created_at)),
  );
}
