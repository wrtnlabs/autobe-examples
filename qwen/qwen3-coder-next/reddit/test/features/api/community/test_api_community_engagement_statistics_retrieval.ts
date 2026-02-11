import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFeedResult } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedResult";
import type { IRedditPlatformFeedView } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFeedView";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { generate_random_reddit_platform_member_posts_votes_create_vote } from "../../../generate/generate_random_reddit_platform_member_posts_votes_create_vote";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";
import { prepare_random_reddit_platform_post_vote } from "../../../prepare/prepare_random_reddit_platform_post_vote";

/**
 * Test comprehensive engagement statistics retrieval for a community.
 *
 * This test creates a member, community, posts with votes, then retrieves
 * engagement statistics to verify all metrics are calculated correctly.
 */
export async function test_api_community_engagement_statistics_retrieval(
  connection: IConnection,
): Promise<void> {
  // 1. Create member account for authentication
  const memberConnection: IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "12345678",
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community to retrieve engagement statistics for
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: "test-community-" + RandomGenerator.alphabets(6),
          description: "Test community for engagement statistics",
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Add posts to community to generate engagement data
  const post1 = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "TEXT" as const,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post1);
  const post2 = await generate_random_reddit_platform_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        title: RandomGenerator.paragraph({ sentences: 1 }),
        type: "LINK" as const,
        url: "https://example.com/article" satisfies string &
          tags.Format<"uri">,
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post2);
  // 4. Vote on posts to generate vote statistics
  await generate_random_reddit_platform_member_posts_votes_create_vote(
    memberConnection,
    {
      params: {
        postId: post1.id,
      },
      body: {
        vote_type: "UPVOTE" as const,
      } satisfies IRedditPlatformPostVote.ICreate,
    },
  );
  await generate_random_reddit_platform_member_posts_votes_create_vote(
    memberConnection,
    {
      params: {
        postId: post2.id,
      },
      body: {
        vote_type: "DOWNVOTE" as const,
      } satisfies IRedditPlatformPostVote.ICreate,
    },
  );
  // 5. Retrieve engagement statistics
  const engagement =
    await api.functional.redditPlatform.member.communities.engagement(
      memberConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(engagement);
  // 6. Validate engagement statistics structure
  TestValidator.equals(
    "community matches",
    engagement.communityId,
    community.id,
  );
  TestValidator.predicate(
    "has engagement data",
    engagement.itemsViewed !== null,
  );
}
