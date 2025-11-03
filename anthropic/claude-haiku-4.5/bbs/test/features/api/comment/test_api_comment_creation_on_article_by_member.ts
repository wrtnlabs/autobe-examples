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
 * Tests creating a top-level comment on an article as an authenticated member.
 *
 * Validates the complete comment creation workflow: member authentication,
 * article creation, substantive comment posting, and system validation of
 * comment metadata. This test ensures members can engage in discussions through
 * the primary participation mechanism - posting comments on articles.
 *
 * Workflow:
 *
 * 1. Register and authenticate a member with valid credentials
 * 2. Create an article for the member to comment on
 * 3. Post a substantive top-level comment (1-5000 characters)
 * 4. Validate comment metadata (author, timestamp, thread depth 0, status
 *    published)
 * 5. Verify comment record has proper UUID identifier
 */
export async function test_api_comment_creation_on_article_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword =
    RandomGenerator.alphabets(8).toUpperCase() +
    RandomGenerator.alphabets(8).toLowerCase() +
    RandomGenerator.alphaNumeric(2);

  const memberAuth: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(memberAuth);
  TestValidator.predicate(
    "member authorization token should exist",
    !!memberAuth.token.access,
  );

  // Step 2: Create an article for commenting
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_code: RandomGenerator.pick(["economics", "politics"] as const),
        attachments: undefined,
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.predicate(
    "article should have UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      article.id,
    ),
  );
  TestValidator.equals(
    "article author should match member",
    article.author.email,
    memberEmail,
  );
  TestValidator.equals(
    "article status should be published",
    article.status,
    "published",
  );

  // Step 3: Post a top-level comment on the article
  const commentText = RandomGenerator.paragraph({
    sentences: RandomGenerator.pick([1, 2, 3, 4, 5] as const),
    wordMin: 3,
    wordMax: 10,
  });

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentText,
          parent_comment_id: undefined,
          attachments: undefined,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Validate comment metadata
  TestValidator.predicate(
    "comment should have UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      comment.id,
    ),
  );
  TestValidator.equals(
    "comment article reference should match",
    comment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment author should match member",
    comment.author.email,
    memberEmail,
  );
  TestValidator.equals(
    "comment content should match input",
    comment.content,
    commentText,
  );
  TestValidator.equals(
    "comment status should be published",
    comment.status,
    "published",
  );
  TestValidator.equals(
    "top-level comment thread depth should be 0",
    comment.thread_depth,
    0,
  );
  TestValidator.predicate(
    "comment parent should be null for top-level",
    comment.parent_comment_id === null ||
      comment.parent_comment_id === undefined,
  );
  TestValidator.equals("comment edit count should be 0", comment.edit_count, 0);
  TestValidator.equals(
    "comment reply count should be 0",
    comment.reply_count,
    0,
  );
  TestValidator.predicate(
    "comment should have created_at timestamp",
    !!comment.created_at,
  );
  TestValidator.predicate(
    "comment should have updated_at timestamp",
    !!comment.updated_at,
  );
  TestValidator.predicate(
    "created_at should be ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(comment.created_at),
  );
}
