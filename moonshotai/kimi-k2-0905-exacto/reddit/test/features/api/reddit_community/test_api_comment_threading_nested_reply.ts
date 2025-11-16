import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test creating a nested comment reply to demonstrate the platform's threading
 * capabilities.
 *
 * This test validates the hierarchical comment system where users can reply to
 * specific comments rather than just the original post. The test ensures
 * parent_comment_id references are properly maintained and thread depth is
 * correctly calculated for nested discussions.
 *
 * The implementation must validate that reply comments maintain proper
 * threading relationships and display hierarchy through the following steps:
 *
 * 1. Create an authenticated member account for comment creation
 * 2. Create a new post to host the comment thread
 * 3. Create a top-level parent comment on the post
 * 4. Create a nested reply comment that references the parent comment
 * 5. Validate that the nested comment has correct thread depth and parent
 *    references
 */
export async function test_api_comment_threading_nested_reply(
  connection: api.IConnection,
) {
  // Create authenticated member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      nickname: RandomGenerator.name(),
      email: memberEmail,
      password: "TestPass123!",
    } satisfies IRedditCommunityMember.ICreate,
  });
  typia.assert(member);

  // Create a post to host the comment thread
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 8,
        }),
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Create top-level parent comment
  const parentComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 10,
          }),
          reddit_post_id: post.id,
          href: `https://example.com/post/${post.id}`,
          referrer: "https://example.com/community",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(parentComment);

  TestValidator.equals(
    "parent comment should have thread_depth of 0",
    parentComment.thread_depth,
    0,
  );

  // Validate parent comment has no parent_comment reference (top-level)
  TestValidator.equals(
    "parent comment should have no parent_comment reference",
    parentComment.parent_comment,
    null,
  );

  // Create nested reply comment that references the parent comment
  const nestedReply =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          content: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 5,
            wordMax: 8,
          }),
          parent_comment_id: parentComment.id,
          reddit_post_id: post.id,
          href: `https://example.com/post/${post.id}`,
          referrer: "https://example.com/community",
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(nestedReply);

  // Validate nested reply has correct threading properties
  TestValidator.equals(
    "nested reply should have thread_depth of 1",
    nestedReply.thread_depth,
    1,
  );
  TestValidator.equals(
    "nested reply author should match our member",
    nestedReply.author.id,
    member.id,
  );

  // Validate parent_comment relationship exists (not null or undefined)
  TestValidator.predicate(
    "nested reply should have parent_comment relationship",
    nestedReply.parent_comment !== null &&
      nestedReply.parent_comment !== undefined,
  );

  // If parent_comment exists, validate its properties
  if (nestedReply.parent_comment) {
    TestValidator.equals(
      "nested reply should reference correct parent comment",
      nestedReply.parent_comment.id,
      parentComment.id,
    );
  }
}
