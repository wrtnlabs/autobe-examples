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
 * Test that a member can create a comment on a post in a community
 * they are NOT subscribed to.
 *
 * This validates the business rule that subscription is not required
 * for commenting (unlike post creation which requires subscription).
 */
export async function test_api_comment_creation_without_subscription(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member who will own the community and post
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  // Step 2: Owner creates a community
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {},
    );
  // Step 3: Owner creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      ownerConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  // Step 4: Create second member who will comment WITHOUT subscribing
  const commenterConnection: api.IConnection = { host: connection.host };
  const commenter = await authorize_member_join(commenterConnection, {});
  // Step 5: Second member creates comment on the post
  // Note: This should succeed even though they are NOT subscribed to the community
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      commenterConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  // Step 6: Validate the comment was created successfully
  typia.assert(comment);
  // Verify author is the second member (not the community owner)
  TestValidator.equals(
    "comment author is the commenter",
    comment.author.id,
    commenter.id,
  );
  // Verify vote score is initialized to zero
  TestValidator.equals("vote score is zero", comment.voteScore, 0);
  // Verify content exists
  TestValidator.predicate("comment has content", comment.content.length > 0);
}
