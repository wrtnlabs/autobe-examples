import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test that a member can successfully update the content of a comment they created.
 *
 * Validates the complete comment update workflow including member authentication, post creation, comment creation, and comment content update. Ensures that the comment's created_at timestamp remains unchanged while updated_at is refreshed, and all other comment metadata (author, post reference, vote score, reply count) remains intact after the update.
 *
 * Special attention is given to verifying timestamp immutability for created_at and proper update for updated_at, confirming that only the content field is modifiable while structural relationships and aggregated metrics are preserved.
 *
 * 1. Member authenticates via join endpoint with email, password, and username.
 * 2. Member creates a post in a subscribed community.
 * 3. Member creates a comment on the post with initial content.
 * 4. Member updates the comment with new content text.
 * 5. Validates that the updated comment contains the new content.
 * 6. Validates that created_at timestamp matches the original creation time.
 * 7. Validates that updated_at timestamp is different from created_at (reflecting the update).
 * 8. Validates that author, post reference, vote score, and reply count remain unchanged.
 */
export async function test_api_comment_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 2. Create a post
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    { body: {} },
  );
  typia.assert(post);
  // 3. Create a comment on the post
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {},
      },
    );
  typia.assert(comment);
  // Store original timestamps for validation
  const originalCreatedAt = comment.created_at;
  const originalUpdatedAt = comment.updated_at;
  const originalContent = comment.content;
  // 4. Update the comment with new content
  const updatedComment =
    await api.functional.redditClone.member.posts.comments.update(
      memberConnection,
      {
        postId: post.id,
        commentId: comment.id,
        body: {
          content: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCloneComment.IUpdate,
      },
    );
  typia.assert(updatedComment);
  // 5. Validate the updated comment contains new content
  TestValidator.notEquals(
    "content changed",
    updatedComment.content,
    originalContent,
  );
  // 6. Validate created_at remains unchanged
  TestValidator.equals(
    "created_at unchanged",
    updatedComment.created_at,
    originalCreatedAt,
  );
  // 7. Validate updated_at is refreshed (different from original)
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedComment.updated_at,
    originalUpdatedAt,
  );
  TestValidator.predicate(
    "updated_at is after created_at",
    updatedComment.updated_at > updatedComment.created_at,
  );
  // 8. Validate other fields remain intact
  TestValidator.equals(
    "author unchanged",
    updatedComment.author.id,
    comment.author.id,
  );
  TestValidator.equals(
    "post reference unchanged",
    updatedComment.post.id,
    comment.post.id,
  );
  TestValidator.equals(
    "vote score unchanged",
    updatedComment.voteScore,
    comment.voteScore,
  );
  TestValidator.equals(
    "reply count unchanged",
    updatedComment.replyCount,
    comment.replyCount,
  );
}
