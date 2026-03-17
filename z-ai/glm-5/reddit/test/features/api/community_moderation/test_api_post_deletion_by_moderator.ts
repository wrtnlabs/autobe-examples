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
 * Test that a community owner can delete another member's post.
 *
 * Scenario:
 * 1. Member A creates a community (becomes owner with moderator privileges)
 * 2. Member B creates a post in that community
 * 3. Member A (as owner/moderator) deletes Member B's post
 * 4. Verify the post is successfully deleted
 */
export async function test_api_post_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A joins and creates community (becomes owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 2: Member B joins and creates a post in Member A's community
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberBConnection,
      {
        params: { communityId: community.id },
      },
    );
  typia.assert(post);
  // Step 3: Verify Member A is the community owner (not the post author)
  TestValidator.equals(
    "community owner is Member A",
    community.owner.id,
    memberA.id,
  );
  TestValidator.notEquals(
    "post author is not Member A",
    post.author.id,
    memberA.id,
  );
  TestValidator.equals("post author is Member B", post.author.id, memberB.id);
  // Step 4: Member A (as owner/moderator) deletes Member B's post
  await api.functional.communityPlatform.member.communities.posts.erase(
    memberAConnection,
    {
      communityId: community.id,
      postId: post.id,
    },
  );
  // Step 5: Verify deletion by attempting to delete again (should fail with 404)
  await TestValidator.error(
    "deleted post should not be accessible",
    async () => {
      await api.functional.communityPlatform.member.communities.posts.erase(
        memberAConnection,
        {
          communityId: community.id,
          postId: post.id,
        },
      );
    },
  );
}
