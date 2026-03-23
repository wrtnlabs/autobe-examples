import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

export async function test_api_comment_update_preserves_thread_structure(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that updating a comment preserves its position within the threaded discussion structure.
   * This test validates that comment content updates do not disrupt the hierarchical discussion
   * structure, maintaining parent-child relationships, vote scores, and creation timestamps.
   */
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
      },
    },
  );
  typia.assert(post);
  // 4. Create a parent comment (top-level)
  const parentComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(parentComment);
  // 5. Create a reply comment to the parent comment
  const replyComment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
          parent_id: parentComment.id,
        },
      },
    );
  typia.assert(replyComment);
  // 6. Capture pre-update state
  const originalParentId = replyComment.parent?.id;
  const originalScore = replyComment.score;
  const originalCreatedAt = replyComment.created_at;
  const originalContent = replyComment.content;
  // 7. Update the reply comment's content
  const updatedContent = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditClone.member.comments.update(memberConnection, {
      commentId: replyComment.id,
      body: {
        content: updatedContent,
      } satisfies IRedditCloneComment.IUpdate,
    });
  typia.assert(updatedComment);
  // 8. Validate thread structure preservation
  TestValidator.equals(
    "parent_id preserved after update",
    updatedComment.parent?.id,
    originalParentId,
  );
  TestValidator.equals(
    "score preserved after content update",
    updatedComment.score,
    originalScore,
  );
  TestValidator.equals(
    "created_at timestamp immutable after update",
    updatedComment.created_at,
    originalCreatedAt,
  );
  TestValidator.predicate(
    "updated_at timestamp refreshed after edit",
    updatedComment.updated_at !== originalCreatedAt,
  );
  TestValidator.predicate(
    "parent relationship still exists in response",
    updatedComment.parent !== null,
  );
  TestValidator.equals(
    "parent comment id matches original",
    updatedComment.parent?.id,
    parentComment.id,
  );
  // 9. Validate content was actually updated
  TestValidator.equals(
    "content updated to new value",
    updatedComment.content,
    updatedContent,
  );
  TestValidator.notEquals(
    "content differs from original",
    updatedComment.content,
    originalContent,
  );
}
