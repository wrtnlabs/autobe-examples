import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_home_feed_sorting_options(
  connection: api.IConnection,
): Promise<void> {
  // Note: The SDK function does not expose sorting parameters.
  // This test validates that the home feed returns posts from subscribed
  // communities with proper response structure.
  // Step 1: Create a member account
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {});
  typia.assert(memberAuth);
  // Step 2: Create a community (automatically subscribes the creator)
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
  // Step 3: Create multiple posts with varying creation times
  const posts = await ArrayUtil.asyncRepeat(5, async (index) => {
    const post = await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          communityId: community.id,
          title: `Test Post ${index + 1}: ${RandomGenerator.name()}`,
          contentType: "text",
          textContent: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
    typia.assert(post);
    return post;
  });
  // Step 4: Call home feed
  const homeFeed =
    await api.functional.communityPlatform.member.home.feed(memberConnection);
  typia.assert(homeFeed);
  // Step 5: Validate pagination structure
  TestValidator.predicate(
    "pagination has valid structure",
    homeFeed.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    homeFeed.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    homeFeed.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    homeFeed.pagination.pages >= 0,
  );
  // Step 6: Validate feed contains posts from subscribed community
  TestValidator.predicate("feed contains posts", homeFeed.data.length > 0);
  // Step 7: Validate created posts appear in feed
  const feedPostIds = new Set(homeFeed.data.map((p) => p.id));
  const createdPostIds = posts.map((p) => p.id);
  TestValidator.predicate(
    "created posts appear in feed",
    createdPostIds.every((id) => feedPostIds.has(id)),
  );
  // Step 8: Validate post structure
  const firstPost = homeFeed.data[0];
  TestValidator.predicate(
    "post has valid score",
    typeof firstPost.score === "number",
  );
  TestValidator.predicate(
    "post has valid created_at",
    typeof firstPost.createdAt === "string",
  );
  TestValidator.predicate(
    "post has author info",
    firstPost.author !== null && firstPost.author !== undefined,
  );
  TestValidator.predicate(
    "post has community info",
    firstPost.community !== null && firstPost.community !== undefined,
  );
  TestValidator.predicate(
    "post is from subscribed community",
    firstPost.community.id === community.id,
  );
}
