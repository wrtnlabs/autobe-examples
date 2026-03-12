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

/**
 * Test that a member can successfully update their own comment's content.
 * Validates that: (1) the authenticated member is verified as the comment author,
 * (2) the comment content is updated with the new text, (3) the original creation
 * timestamp (created_at) is preserved, (4) the updated_at timestamp is refreshed,
 * (5) the vote score remains unchanged, (6) the threaded position is maintained,
 * (7) the comment is returned with all fields including author and post references.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
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
        postType: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create a comment on the post
  const originalContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: originalContent,
        },
      },
    );
  typia.assert(comment);
  // Store original values for validation
  const originalCreatedAt = comment.created_at;
  const originalScore = comment.score;
  const originalAuthorId = comment.author.id;
  const originalPostId = comment.post.id;
  const originalParentId = comment.parent?.id ?? null;
  // 5. Update the comment with new content
  const newContent = RandomGenerator.paragraph({ sentences: 4 });
  const updatedComment =
    await api.functional.redditClone.member.comments.update(memberConnection, {
      commentId: comment.id,
      body: {
        content: newContent,
      } satisfies IRedditCloneComment.IUpdate,
    });
  typia.assert(updatedComment);
  // 6. Validate content was updated
  TestValidator.equals("content updated", updatedComment.content, newContent);
  // 7. Validate created_at is preserved
  TestValidator.equals(
    "created_at preserved",
    updatedComment.created_at,
    originalCreatedAt,
  );
  // 8. Validate updated_at is different from created_at
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedComment.updated_at,
    updatedComment.created_at,
  );
  // 9. Validate score remains unchanged
  TestValidator.equals("score unchanged", updatedComment.score, originalScore);
  // 10. Validate author is unchanged
  TestValidator.equals(
    "author unchanged",
    updatedComment.author.id,
    originalAuthorId,
  );
  // 11. Validate post reference is unchanged
  TestValidator.equals(
    "post unchanged",
    updatedComment.post.id,
    originalPostId,
  );
  // 12. Validate parent reference is unchanged
  TestValidator.equals(
    "parent unchanged",
    updatedComment.parent?.id ?? null,
    originalParentId,
  );
}
