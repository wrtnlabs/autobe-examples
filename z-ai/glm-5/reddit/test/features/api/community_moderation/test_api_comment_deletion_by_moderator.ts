import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
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
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

/**
 * Test that a community moderator can delete another member's comment.
 *
 * This test validates the moderation privilege where community owners/moderators
 * have the authority to delete any comment within their community, regardless of
 * who authored the comment.
 *
 * Test Flow:
 * 1. Member A joins and creates a community (becomes owner)
 * 2. Member A creates a post in the community
 * 3. Member B joins and creates a comment on Member A's post
 * 4. Member A (as moderator) deletes Member B's comment
 * 5. Successful deletion confirms moderator privileges work correctly
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Member A joins and creates a community (becomes owner)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {});
  typia.assert(memberA);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  typia.assert(community);
  // Step 2: Member A creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // Step 3: Member B joins and creates a comment on Member A's post
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {});
  typia.assert(memberB);
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberBConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(comment);
  // Step 4: Member A (as community owner/moderator) deletes Member B's comment
  // This should succeed without throwing any error, confirming moderator privileges
  await api.functional.communityPlatform.member.communities.comments.erase(
    memberAConnection,
    {
      communityId: community.id,
      commentId: comment.id,
    },
  );
}
