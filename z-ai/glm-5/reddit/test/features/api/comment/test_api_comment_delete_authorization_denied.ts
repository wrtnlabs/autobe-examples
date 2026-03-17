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
 * Test that a member cannot delete another member's comment if they are not
 * a moderator of the community.
 *
 * This test validates authorization boundaries for comment deletion:
 * - Only comment authors can delete their own comments
 * - Only moderators can delete comments in their community
 * - Unauthorized members receive 403 Forbidden
 */
export async function test_api_comment_delete_authorization_denied(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register Member A (comment author)
  const memberAConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberAConnection, {});
  // Step 2: Member A creates a community (becomes owner)
  const community =
    await generate_random_community_platform_member_communities_create(
      memberAConnection,
      {},
    );
  // Step 3: Member A creates a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberAConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  // Step 4: Member A creates a comment on the post
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      memberAConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  // Step 5: Register Member B (unauthorized member - neither author nor moderator)
  const memberBConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberBConnection, {});
  // Step 6: Attempt to delete the comment with Member B's credentials
  // Should fail with 403 Forbidden because Member B is:
  // - NOT the comment author
  // - NOT a moderator of the community
  await TestValidator.httpError(
    "unauthorized member cannot delete comment",
    403,
    async () =>
      await api.functional.communityPlatform.member.posts.comments.erase(
        memberBConnection,
        {
          postId: post.id,
          commentId: comment.id,
        },
      ),
  );
  // Step 7: Verify comment still exists after failed deletion attempt
  // Member A (the author) can successfully delete, proving the comment was preserved
  // and not deleted by Member B's unauthorized attempt
  await api.functional.communityPlatform.member.posts.comments.erase(
    memberAConnection,
    {
      postId: post.id,
      commentId: comment.id,
    },
  );
  // The successful deletion by the author confirms:
  // 1. The comment existed (was not deleted by unauthorized user)
  // 2. Authorization works correctly (403 was the right response)
}
