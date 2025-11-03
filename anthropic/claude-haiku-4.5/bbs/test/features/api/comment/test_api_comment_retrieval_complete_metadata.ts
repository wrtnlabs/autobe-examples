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
 * Test retrieving a specific comment by ID with complete metadata validation.
 *
 * This test verifies that the API correctly returns a comment including all
 * essential metadata:
 *
 * - Author details (member ID and email for attribution)
 * - Full comment content text
 * - Creation and modification timestamps
 * - Edit count indicator
 * - Thread depth level
 * - Parent comment reference if applicable
 *
 * The complete test workflow:
 *
 * 1. Create a new member to serve as the author
 * 2. Create an article to post comments on
 * 3. Create a top-level comment on the article
 * 4. Retrieve the comment by ID to validate complete metadata is returned
 * 5. Verify all metadata fields are properly populated
 */
export async function test_api_comment_retrieval_complete_metadata(
  connection: api.IConnection,
) {
  // Step 1: Create a new member to be the comment author
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "TestPassword123",
      } satisfies IDiscussionBoardMember.IRegisterRequest,
    });
  typia.assert(member);
  TestValidator.equals("member created successfully", !!member.id, true);
  TestValidator.equals(
    "authorization token present",
    !!member.token.access,
    true,
  );

  // Step 2: Create an article to post comment on
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 2,
          wordMax: 5,
        }),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        category_code: "economics",
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);
  TestValidator.equals("article created successfully", !!article.id, true);
  TestValidator.equals(
    "article has correct category",
    article.category.code,
    "economics",
  );

  // Step 3: Create a top-level comment on the article
  const commentContent = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 3,
    wordMax: 8,
  });
  const createdComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(createdComment);
  TestValidator.equals(
    "comment created successfully",
    !!createdComment.id,
    true,
  );
  TestValidator.equals(
    "comment content matches",
    createdComment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment is published",
    createdComment.status,
    "published",
  );

  // Step 4: Retrieve the comment by ID to validate complete metadata
  const retrievedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.at(connection, {
      articleId: article.id,
      commentId: createdComment.id,
    });
  typia.assert(retrievedComment);

  // Step 5: Verify all metadata fields are properly populated
  TestValidator.equals(
    "comment ID matches",
    retrievedComment.id,
    createdComment.id,
  );
  TestValidator.equals(
    "comment article ID is correct",
    retrievedComment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment content is complete",
    retrievedComment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment status is published",
    retrievedComment.status,
    "published",
  );

  // Verify author metadata is present
  TestValidator.equals(
    "author information present",
    !!retrievedComment.author,
    true,
  );
  TestValidator.equals("author has ID", !!retrievedComment.author.id, true);
  TestValidator.equals(
    "author email present",
    !!retrievedComment.author.email,
    true,
  );
  TestValidator.equals(
    "author account status present",
    !!retrievedComment.author.account_status,
    true,
  );

  // Verify timestamp metadata
  TestValidator.equals(
    "created_at timestamp present",
    !!retrievedComment.created_at,
    true,
  );
  TestValidator.equals(
    "updated_at timestamp present",
    !!retrievedComment.updated_at,
    true,
  );

  // Verify thread structure metadata
  TestValidator.equals(
    "thread depth is zero for top-level comment",
    retrievedComment.thread_depth,
    0,
  );
  TestValidator.equals(
    "reply count initialized",
    typeof retrievedComment.reply_count === "number",
    true,
  );
  TestValidator.equals(
    "edit count initialized",
    retrievedComment.edit_count,
    0,
  );

  // Verify article summary is included
  TestValidator.equals(
    "article summary present",
    !!retrievedComment.article,
    true,
  );
  TestValidator.equals(
    "article summary ID matches",
    retrievedComment.article.id,
    article.id,
  );

  // Verify parent comment is null/undefined for top-level comment
  TestValidator.predicate(
    "parent comment ID is null or undefined for top-level",
    retrievedComment.parent_comment_id === null ||
      retrievedComment.parent_comment_id === undefined,
  );
  TestValidator.predicate(
    "parent comment object is null or undefined",
    retrievedComment.parent_comment === null ||
      retrievedComment.parent_comment === undefined,
  );
}
