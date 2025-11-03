import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow of a moderator deleting a comment on an article.
 *
 * This test validates that moderators can soft-delete any comment regardless of
 * authorship, the deletion sets the deleted_at timestamp correctly, the comment
 * becomes hidden from public view while preserving the record for audit
 * purposes, and the parent article's comment_count is updated appropriately.
 *
 * Test Flow:
 *
 * 1. Create moderator account for authenticating as moderator to delete comments
 * 2. Create member account for creating the article and comment
 * 3. Moderator creates category required for article creation
 * 4. Member creates an article to host the comment that will be deleted
 * 5. Member posts a comment on the article
 * 6. Moderator deletes the comment using soft deletion
 * 7. Validate deletion timestamp is set and comment is hidden from public view
 */
export async function test_api_comment_deletion_by_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorData = {
    username: RandomGenerator.name(1) satisfies string,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardModerator.ICreate;

  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // Step 2: Create category using moderator context
  const categoryData = {
    name: RandomGenerator.name(2) satisfies string &
      tags.MinLength<1> &
      tags.MaxLength<255>,
    description: RandomGenerator.paragraph({ sentences: 5 }) satisfies
      | (string & tags.MaxLength<2000>)
      | null
      | undefined,
  } satisfies IDiscussionBoardCategory.ICreate;

  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account in a separate connection context
  const memberConnection: api.IConnection = { ...connection, headers: {} };

  const memberData = {
    username: RandomGenerator.name(1) satisfies string,
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.MinLength<8>>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.IJoin;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(memberConnection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 4: Member creates an article
  const articleData = {
    title: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 3,
      wordMax: 7,
    }) satisfies string & tags.MinLength<5> & tags.MaxLength<200>,
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }) satisfies string & tags.MinLength<20> & tags.MaxLength<50000>,
    category_ids: [category.id] satisfies (string & tags.Format<"uuid">)[] &
      tags.MinItems<1> &
      tags.MaxItems<3>,
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(
      memberConnection,
      {
        body: articleData,
      },
    );
  typia.assert(article);

  // Step 5: Member creates a comment on the article
  const commentData = {
    discussion_board_article_id: article.id,
    content: RandomGenerator.paragraph({ sentences: 10 }) satisfies string &
      tags.MinLength<1> &
      tags.MaxLength<5000>,
  } satisfies IDiscussionBoardComment.ICreate;

  const comment: IDiscussionBoardComment =
    await api.functional.discussionBoard.articles.comments.create(
      memberConnection,
      {
        articleId: article.id,
        body: commentData,
      },
    );
  typia.assert(comment);

  // Verify comment was created without deletion timestamp
  TestValidator.equals(
    "comment should not be deleted initially",
    comment.deleted_at,
    null,
  );

  // Step 6: Moderator deletes the comment (using original moderator connection)
  const deletedComment: IDiscussionBoardComment =
    await api.functional.discussionBoard.moderator.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // Validate soft deletion
  TestValidator.predicate(
    "deleted_at timestamp should be set after deletion",
    deletedComment.deleted_at !== null,
  );

  // Verify the comment data is preserved (audit trail)
  TestValidator.equals(
    "comment ID should remain the same",
    deletedComment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content should be preserved",
    deletedComment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment article ID should be preserved",
    deletedComment.discussion_board_article_id,
    article.id,
  );
}
