import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_posts_comments_create } from "../../../generate/generate_random_reddit_community_member_posts_comments_create";
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { prepare_random_reddit_community_comment } from "../../../prepare/prepare_random_reddit_community_comment";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";

/**
 * Test top-level comment creation on a post with complete validation.
 *
 * Validates the complete workflow of member registration, post creation, and top-level comment creation.
 * Ensures that the comment entity is correctly structured with all required fields, references are
 * properly resolved, and the post's comment count is atomically updated.
 *
 * Special attention is given to verifying that top-level comments have null parent reference,
 * and that author and post references contain the correct summary data.
 *
 * 1. Register a new member with randomized credentials and session context.
 * 2. Create a text post in a community using the registered member's authenticated connection.
 * 3. Create a top-level comment on the post without specifying a parent comment ID.
 * 4. Validate all comment fields including UUID validation, content match, author and post references.
 * 5. Verify parent is null to confirm top-level comment.
 * 6. Confirm post's comment_count was incremented by checking the comment's post reference.
 */
export async function test_api_comment_create_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create post
  const commentContent = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 4,
    wordMax: 8,
  });
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        post_type: "text",
        reddit_community_community_id: typia.random<
          string & tags.Format<"uuid">
        >(),
        text_content: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 3. Create top-level comment (no parentCommentId)
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      memberConnection,
      {
        postId: post.id,
        body: {
          content: commentContent,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);
  // 4. Validate comment response
  TestValidator.equals(
    "comment content matches",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "author matches authenticated member",
    comment.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "author username matches",
    comment.author.username,
    memberAuth.username,
  );
  TestValidator.equals("post matches target post", comment.post.id, post.id);
  TestValidator.equals("post title matches", comment.post.title, post.title);
  TestValidator.equals("parent is null (top-level)", comment.parent, null);
  TestValidator.equals("votes_count starts at 0", comment.votes_count, 0);
  TestValidator.predicate(
    "created_at is valid date-time format",
    !isNaN(Date.parse(comment.created_at)),
  );
  TestValidator.equals(
    "updated_at matches created_at",
    comment.updated_at,
    comment.created_at,
  );
  TestValidator.equals("deleted_at is null (active)", comment.deleted_at, null);
  TestValidator.equals(
    "post comment_count is 1 after creation",
    comment.post.comment_count,
    1,
  );
  TestValidator.predicate(
    "post updated_at is valid date-time format",
    !isNaN(Date.parse(comment.post.updated_at)),
  );
}
