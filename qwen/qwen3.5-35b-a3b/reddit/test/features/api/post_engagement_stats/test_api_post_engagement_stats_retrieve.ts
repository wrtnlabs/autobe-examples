import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostEngagementStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostEngagementStat";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_engagement_stats_retrieve(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(memberAuth);
  // Create new connection with member's token for authenticated operations
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: memberAuth.token.access },
  };
  // 2. Create a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      authenticatedConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<1> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z][a-zA-Z0-9_-]*$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe to the community
  await generate_random_reddit_platform_member_communities_subscribe(
    authenticatedConnection,
    {
      body: { confirmSubscription: true },
      params: { communityId: community.id },
    },
  );
  // 4. Create a post (automatically creates engagement stats)
  const post = await generate_random_reddit_platform_member_posts_create(
    authenticatedConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 8,
          wordMax: 12,
        }),
      },
    },
  );
  typia.assert(post);
  // 5. Retrieve post details to verify post exists and get engagement stats ID
  const retrievedPost = await api.functional.redditPlatform.posts.at(
    authenticatedConnection,
    { postId: post.id },
  );
  typia.assert(retrievedPost);
  // The engagement stats record shares the same ID as the post
  // (based on the one-to-one relationship in the system)
  const statId = post.id;
  // 6. Retrieve engagement stats by statId
  const engagementStats =
    await api.functional.redditPlatform.post_engagement_stats.at(
      authenticatedConnection,
      { statId },
    );
  typia.assert(engagementStats);
  // 7. Validate all engagement stat fields
  // View count validation
  TestValidator.equals(
    "view_count is non-negative",
    engagementStats.view_count,
    typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      engagementStats.view_count,
    ),
  );
  // Upvote count validation
  TestValidator.equals(
    "upvote_count is non-negative",
    engagementStats.upvote_count,
    typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      engagementStats.upvote_count,
    ),
  );
  // Downvote count validation
  TestValidator.equals(
    "downvote_count is non-negative",
    engagementStats.downvote_count,
    typia.assert<number & tags.Type<"int32"> & tags.Minimum<0>>(
      engagementStats.downvote_count,
    ),
  );
  // Timestamp validations
  TestValidator.predicate(
    "last_viewed_at is valid timestamp",
    () => new Date(engagementStats.last_viewed_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at is valid timestamp",
    () => new Date(engagementStats.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at is valid timestamp",
    () => new Date(engagementStats.updated_at).getTime() > 0,
  );
  TestValidator.predicate(
    "deleted_at is null (active record)",
    () => engagementStats.deleted_at === null,
  );
  // Parent post ID matches statId
  TestValidator.equals(
    "parent post ID matches statId",
    engagementStats.post.id,
    statId,
  );
  // Post title matches retrieved post
  TestValidator.equals(
    "post title matches retrieved post",
    engagementStats.post.title,
    retrievedPost.title,
  );
  // Post type matches (note: ISummary uses snake_case)
  TestValidator.equals(
    "post type matches",
    engagementStats.post.post_type,
    retrievedPost.postType,
  );
  // Vote score matches (note: ISummary uses snake_case)
  TestValidator.equals(
    "post vote_score matches",
    engagementStats.post.vote_score,
    retrievedPost.voteScore,
  );
  // Comment count matches (note: ISummary uses snake_case)
  TestValidator.equals(
    "post comment_count matches",
    engagementStats.post.comment_count,
    retrievedPost.commentCount,
  );
  // Final verification that engagement stats parent post is the created post
  TestValidator.equals(
    "engagement stats parent post is the created post",
    engagementStats.post.id,
    post.id,
  );
}
