import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test that attempting to remove a vote that doesn't exist returns 404 Not Found.
 *
 * Setup:
 * 1. Member authenticates
 * 2. Member creates a community (becoming owner)
 * 3. Member creates a text post in their community
 * 4. Member does NOT cast any vote on the post
 *
 * Action: Call DELETE to attempt vote removal on this post
 *
 * Validation: Response returns 404 Not Found status
 */
export async function test_api_post_vote_removal_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community (member becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a text post in the community (without voting on it)
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          postType: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          content: RandomGenerator.content({ paragraphs: 1 }),
        },
      },
    );
  typia.assert(post);
  // 4. Attempt to remove vote that doesn't exist - should return 404 Not Found
  await TestValidator.httpError(
    "vote removal without existing vote should return 404",
    404,
    async () =>
      await api.functional.communityPlatform.member.posts.vote.erase(
        memberConnection,
        {
          postId: post.id,
        },
      ),
  );
}
