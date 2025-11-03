import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IDiscussionBoardAttachmentCreate } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachmentCreate";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test comment retrieval and metadata preservation for moderated visibility.
 *
 * This test validates that when retrieving a discussion board comment, the API
 * returns complete and accurate comment metadata including author information,
 * timestamps, thread structure, and content. This ensures that comment
 * retrieval properly preserves essential information regardless of moderation
 * state.
 *
 * Test steps:
 *
 * 1. Create a member to serve as the article creator
 * 2. Create another member to author a comment
 * 3. Create an article for commenting
 * 4. Post a comment on the article with substantive content
 * 5. Retrieve the comment via API endpoint
 * 6. Validate all comment metadata is properly preserved
 * 7. Verify comment relationships and structure integrity
 */
export async function test_api_comment_retrieval_moderated_visibility(
  connection: api.IConnection,
) {
  // Step 1: Create first member (article author)
  const member1Email = typia.random<string & tags.Format<"email">>();
  const member1Password = "Password123";
  const member1 = await api.functional.auth.member.join(connection, {
    body: {
      email: member1Email,
      password: member1Password,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member1);

  // Step 2: Create second member (comment author)
  const member2Email = typia.random<string & tags.Format<"email">>();
  const member2Password = "Password456";
  const member2 = await api.functional.auth.member.join(connection, {
    body: {
      email: member2Email,
      password: member2Password,
    } satisfies IDiscussionBoardMember.IRegisterRequest,
  });
  typia.assert(member2);

  // Switch to member1's account
  connection.headers ??= {};
  connection.headers.Authorization = member1.token.access;

  // Step 3: Create article for commenting
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 4,
          wordMax: 8,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Switch to member2's account
  connection.headers.Authorization = member2.token.access;

  // Step 4: Create comment on article
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 10,
  });
  const originalComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(originalComment);

  // Step 5: Retrieve the comment to verify structure and metadata
  const retrievedComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: originalComment.id,
    });
  typia.assert(retrievedComment);

  // Step 6: Validate all comment metadata is properly preserved
  TestValidator.equals(
    "retrieved comment ID matches original",
    retrievedComment.id,
    originalComment.id,
  );

  TestValidator.equals(
    "retrieved comment belongs to correct article",
    retrievedComment.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "comment author email matches creator",
    retrievedComment.author.email,
    member2Email,
  );

  TestValidator.equals(
    "article reference in comment matches",
    retrievedComment.article.id,
    article.id,
  );

  TestValidator.predicate(
    "comment status is valid publication state",
    ["published", "moderated", "deleted"].includes(retrievedComment.status),
  );

  TestValidator.predicate(
    "comment content is preserved",
    retrievedComment.content.length > 0,
  );

  TestValidator.predicate(
    "comment content matches original",
    retrievedComment.content === commentContent ||
      retrievedComment.status !== "published",
  );

  // Step 7: Verify comment relationships and structure integrity
  TestValidator.equals(
    "comment thread depth is zero for top-level",
    retrievedComment.thread_depth,
    0,
  );

  TestValidator.predicate(
    "comment has non-null parent article",
    retrievedComment.article !== null && retrievedComment.article !== undefined,
  );

  TestValidator.predicate(
    "comment has valid author information",
    retrievedComment.author !== null && retrievedComment.author.id !== null,
  );

  TestValidator.predicate(
    "author account status is valid",
    ["active", "suspended", "banned"].includes(
      retrievedComment.author.account_status,
    ),
  );

  TestValidator.predicate(
    "comment has valid timestamps",
    retrievedComment.created_at !== null &&
      retrievedComment.updated_at !== null,
  );

  TestValidator.predicate(
    "created_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedComment.created_at),
  );

  TestValidator.predicate(
    "updated_at timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedComment.updated_at),
  );

  TestValidator.predicate(
    "comment has non-negative edit count",
    retrievedComment.edit_count >= 0,
  );

  TestValidator.predicate(
    "comment has non-negative reply count",
    retrievedComment.reply_count >= 0,
  );

  TestValidator.predicate(
    "parent comment is null for top-level",
    retrievedComment.parent_comment === null ||
      retrievedComment.parent_comment === undefined,
  );
}
