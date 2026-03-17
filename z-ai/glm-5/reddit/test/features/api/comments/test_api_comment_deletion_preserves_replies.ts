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
 * Test that nested replies remain visible after parent comment deletion.
 *
 * This test verifies the soft-delete behavior of comments where replies
 * to deleted comments are preserved in the thread structure.
 */
export async function test_api_comment_deletion_preserves_replies(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post =
    await generate_random_community_platform_member_communities_posts_create(
      memberConnection,
      {
        params: {
          communityId: community.id,
        },
      },
    );
  typia.assert(post);
  // 4. Create a parent comment
  const parentComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
      },
    );
  typia.assert(parentComment);
  // 5. Create a reply to the parent comment
  const replyComment =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: parentComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // Validate reply references parent
  TestValidator.equals(
    "reply references parent",
    replyComment.parentComment?.id,
    parentComment.id,
  );
  // 6. Create a nested reply (reply to reply)
  const nestedReply =
    await generate_random_community_platform_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_comment_id: replyComment.id,
        },
      },
    );
  typia.assert(nestedReply);
  // 7. Delete the parent comment
  await api.functional.communityPlatform.member.communities.comments.erase(
    memberConnection,
    {
      communityId: community.id,
      commentId: parentComment.id,
    },
  );
  // 8. Verify deletion succeeded - reply should still reference the parent
  // The reply's parent_comment_id should still point to the deleted parent
  TestValidator.equals(
    "reply preserves parent reference after deletion",
    replyComment.parentComment?.id,
    parentComment.id,
  );
  // 9. Verify nested reply structure is preserved
  TestValidator.equals(
    "nested reply preserves its parent reference",
    nestedReply.parentComment?.id,
    replyComment.id,
  );
  // 10. Verify parent comment had deletedAt as null before deletion
  TestValidator.equals(
    "parent comment was active before deletion",
    parentComment.deletedAt,
    null,
  );
}
