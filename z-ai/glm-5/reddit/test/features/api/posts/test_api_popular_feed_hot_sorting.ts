import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_communities_posts_create } from "../../../generate/generate_random_community_platform_member_communities_posts_create";
import { generate_random_community_platform_member_posts_vote_create } from "../../../generate/generate_random_community_platform_member_posts_vote_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

/**
 * Test the Popular Feed with hot sorting to validate the trending content algorithm.
 * The hot sorting algorithm prioritizes recent posts with high engagement,
 * calculated as (vote_score / POWER(EXTRACT(EPOCH FROM (NOW() - created_at)) / 3600 + 2, 1.8)) DESC.
 *
 * Setup: Create two members (member1, member2), create a community, member1 creates
 * two posts (post1 and post2), member2 upvotes post1 to give it higher engagement.
 *
 * Execute: Call PATCH /communityPlatform/posts with sort='hot' (default).
 *
 * Validate: Response returns paginated posts in correct hot sorting order
 * (post1 with higher engagement should rank higher than post2),
 * each post includes id, title, postType, author, community, voteScore,
 * commentCount, createdAt. Verify pagination metadata.
 */
export async function test_api_popular_feed_hot_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member1 (community owner and post author)
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {});
  typia.assert(member1);
  // 2. Create member2 (voter)
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {});
  typia.assert(member2);
  // 3. Member1 creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: `hot-sort-test-${Date.now()}-${RandomGenerator.alphabets(6)}`,
          description: "Community for testing hot sorting algorithm",
        },
      },
    );
  typia.assert(community);
  // 4. Member1 creates first post (post1)
  const post1 =
    await generate_random_community_platform_member_communities_posts_create(
      member1Connection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          title: "First Post - Hot Sorting Test",
          postType: "text",
          content:
            "This is the first post content for testing hot sorting algorithm with engagement",
        },
      },
    );
  typia.assert(post1);
  // 5. Wait briefly to ensure post2 has a later creation time
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 6. Member1 creates second post (post2)
  const post2 =
    await generate_random_community_platform_member_communities_posts_create(
      member1Connection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          title: "Second Post - Hot Sorting Test",
          postType: "text",
          content:
            "This is the second post content for testing hot sorting algorithm",
        },
      },
    );
  typia.assert(post2);
  // 7. Member2 upvotes post1 to create higher engagement
  const vote =
    await generate_random_community_platform_member_posts_vote_create(
      member2Connection,
      {
        params: {
          postId: post1.id,
        },
        body: {
          targetType: "post",
          targetId: post1.id,
          voteType: "upvote",
        },
      },
    );
  typia.assert(vote);
  // 8. Call Popular Feed API with hot sorting
  const feed = await api.functional.communityPlatform.posts.index(connection, {
    body: {
      sort: "hot",
    },
  });
  typia.assert(feed);
  // 9. Validate pagination metadata exists
  TestValidator.predicate("pagination metadata exists", () => {
    return (
      feed.pagination !== undefined &&
      typeof feed.pagination.current === "number" &&
      typeof feed.pagination.limit === "number" &&
      typeof feed.pagination.records === "number" &&
      typeof feed.pagination.pages === "number"
    );
  });
  // 10. Find our test posts in the feed
  const post1InFeed = feed.data.find((p) => p.id === post1.id);
  const post2InFeed = feed.data.find((p) => p.id === post2.id);
  // Both posts must exist in the feed
  if (post1InFeed === undefined || post2InFeed === undefined) {
    throw new Error("Test posts not found in the feed");
  }
  // 11. Validate post1 has higher vote score due to upvote
  TestValidator.equals("post1 vote score", post1InFeed.voteScore, 1);
  TestValidator.equals("post2 vote score", post2InFeed.voteScore, 0);
  // 12. Validate post1 ranks higher than post2 (hot sorting)
  const post1Index = feed.data.findIndex((p) => p.id === post1.id);
  const post2Index = feed.data.findIndex((p) => p.id === post2.id);
  TestValidator.predicate(
    "post1 ranks higher than post2 in hot sorting",
    () => post1Index < post2Index,
  );
  // 13. Validate post structure contains all required fields
  TestValidator.predicate("post1 has required fields", () => {
    return (
      post1InFeed.id !== undefined &&
      post1InFeed.title !== undefined &&
      post1InFeed.postType !== undefined &&
      post1InFeed.author !== undefined &&
      post1InFeed.author.id !== undefined &&
      post1InFeed.author.username !== undefined &&
      post1InFeed.community !== undefined &&
      post1InFeed.community.id !== undefined &&
      post1InFeed.community.name !== undefined &&
      typeof post1InFeed.voteScore === "number" &&
      typeof post1InFeed.commentCount === "number" &&
      post1InFeed.createdAt !== undefined
    );
  });
  // 14. Validate post2 has required fields
  TestValidator.predicate("post2 has required fields", () => {
    return (
      post2InFeed.id !== undefined &&
      post2InFeed.title !== undefined &&
      post2InFeed.postType !== undefined &&
      post2InFeed.author !== undefined &&
      post2InFeed.community !== undefined &&
      typeof post2InFeed.voteScore === "number" &&
      typeof post2InFeed.commentCount === "number" &&
      post2InFeed.createdAt !== undefined
    );
  });
}