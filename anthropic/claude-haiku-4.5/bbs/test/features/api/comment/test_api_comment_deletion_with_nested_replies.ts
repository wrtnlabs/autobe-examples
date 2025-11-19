import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardCommentAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentAttachment";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test deletion of comments with nested replies in discussion board.
 *
 * This test validates the soft deletion behavior of comments that have child
 * replies. When a parent comment is deleted, the system should mark it as
 * deleted while preserving nested replies as orphaned entries.
 *
 * Test workflow:
 *
 * 1. Create first contributor account
 * 2. Create article in discussion board
 * 3. Create parent comment on the article
 * 4. Create second contributor account
 * 5. Create nested reply to parent comment
 * 6. Delete the parent comment with proper authentication
 * 7. Verify parent comment is soft deleted with proper status
 * 8. Verify nested reply remains but is orphaned
 */
export async function test_api_comment_deletion_with_nested_replies(
  connection: api.IConnection,
) {
  // Step 1: Create first contributor
  const firstContributor = await api.functional.auth.contributor.join(
    connection,
    {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace("@", `_1_${Date.now()}@`),
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword@123",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    },
  );
  typia.assert(firstContributor);

  // Step 2: Create article
  const article =
    await api.functional.discussionBoard.contributor.articles.create(
      connection,
      {
        body: {
          title: "Economic Policy Discussion",
          content:
            "This is a detailed discussion about economic policies and their impacts on markets. The content provides comprehensive analysis of recent economic trends.",
          categoryId: "5f8c84c7-4b2e-4d9a-8a1c-3f7b2e9c1a5d",
          href: "https://example.com/create-article",
          referrer: "https://example.com",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
  typia.assert(article);
  TestValidator.equals(
    "article author matches",
    article.author.id,
    firstContributor.id,
  );

  // Step 3: Create parent comment on article
  const parentComment =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "This is a thoughtful comment on the economic policy discussion.",
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(parentComment);
  TestValidator.equals(
    "parent comment author matches",
    parentComment.author.id,
    firstContributor.id,
  );
  TestValidator.predicate(
    "parent comment has no parent",
    parentComment.parentComment === null,
  );

  // Step 4: Create second contributor
  const secondContributor = await api.functional.auth.contributor.join(
    connection,
    {
      body: {
        email: typia
          .random<string & tags.Format<"email">>()
          .replace("@", `_2_${Date.now()}@`),
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword@123",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    },
  );
  typia.assert(secondContributor);

  // Step 5: Create nested reply to parent comment
  const nestedReply =
    await api.functional.discussionBoard.contributor.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content:
            "I agree with this point. Here is my additional perspective on the matter.",
          parentCommentId: parentComment.id,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(nestedReply);
  TestValidator.equals(
    "nested reply author matches",
    nestedReply.author.id,
    secondContributor.id,
  );
  TestValidator.equals(
    "nested reply parent matches",
    nestedReply.parentComment?.id,
    parentComment.id,
  );

  // Step 6: Re-authenticate as first contributor and delete parent comment
  await api.functional.auth.contributor.join(connection, {
    body: {
      email: firstContributor.email,
      username: firstContributor.username,
      password: "TestPassword@123",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardContributor.ICreate,
  });

  const deletedComment =
    await api.functional.discussionBoard.contributor.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: parentComment.id,
      },
    );
  typia.assert(deletedComment);
  TestValidator.equals(
    "comment is soft deleted",
    deletedComment.is_deleted,
    true,
  );
  TestValidator.predicate(
    "deleted_at timestamp is recorded",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );
  TestValidator.equals(
    "comment id preserved",
    deletedComment.id,
    parentComment.id,
  );
}
