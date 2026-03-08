import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_posts_community_feed_top_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connection
  const memberConnection: api.IConnection = { host: connection.host };
  // Step 1: Create a member account
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // Step 2: Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: `test_community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Subscribe to the community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // Step 4: Create multiple posts with different vote scores
  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    const post = await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          title: `Test Post ${index + 1} - ${RandomGenerator.name()}`,
          contentType: "text",
          textContent: RandomGenerator.paragraph({ sentences: 3 }),
          linkUrl: null,
          imageUrl: null,
        },
      },
    );
    typia.assert(post);
    return post;
  });
  // Verify posts were created with initial score (posts get self-upvote)
  TestValidator.predicate(
    "posts created with score",
    posts.every((p) => p.score >= 0),
  );
  // Step 5: Call the community feed endpoint with top sorting
  const feedResponse = await api.functional.communityPlatform.posts.index(
    connection, // Public endpoint - no auth required
    {
      body: {
        communityId: community.id,
        sort: "top",
        timeFilter: "this_week",
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(feedResponse);
  // Step 6: Verify all posts are from the specified community
  TestValidator.predicate(
    "all posts from specified community",
    feedResponse.data.every((post) => post.community.id === community.id),
  );
  // Step 7: Validate posts are ordered by score DESC
  const scores = feedResponse.data.map((post) => post.score);
  for (let i = 0; i < scores.length - 1; i++) {
    TestValidator.predicate(
      "posts ordered by score DESC",
      scores[i] >= scores[i + 1],
    );
  }
  // Step 8: Verify pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    feedResponse.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    feedResponse.pagination.limit >= 1 && feedResponse.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records is valid",
    feedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is valid",
    feedResponse.pagination.pages >= 0,
  );
  // Verify the created posts appear in the feed
  const postIds = feedResponse.data.map((p) => p.id);
  const createdPostIds = posts.map((p) => p.id);
  TestValidator.predicate(
    "created posts appear in feed",
    createdPostIds.every((id) => postIds.includes(id)),
  );
}
