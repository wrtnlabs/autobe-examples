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

export async function test_api_comment_soft_delete_moderation_logging(
  connection: api.IConnection,
) {
  // Step 1: Create member account who will post the comment
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "Member123!@#";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 2: Create moderator account for category creation and comment deletion
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "Moderator123!@#";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Moderator creates category (required for article creation)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create a new member who will create article and comment
  const commentAuthorEmail = typia.random<string & tags.Format<"email">>();
  const commentAuthorPassword = "Author123!@#";

  const commentAuthor = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: commentAuthorEmail,
      password: commentAuthorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(commentAuthor);

  // Step 5: Member creates article with the category
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 6: Member posts comment on their article
  const commentContent = RandomGenerator.paragraph({ sentences: 5 });

  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          content: commentContent,
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Verify comment is created without deletion timestamp
  TestValidator.equals(
    "comment should not be deleted initially",
    comment.deleted_at,
    null,
  );

  // Step 7: Switch to moderator authentication for comment deletion
  const moderatorForDeletion = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    },
  );
  typia.assert(moderatorForDeletion);

  // Step 8: Moderator soft-deletes the member's comment
  const deletedComment =
    await api.functional.discussionBoard.member.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // Step 9: Verify comment is soft-deleted with deleted_at timestamp
  TestValidator.predicate(
    "deleted comment should have deleted_at timestamp",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );

  // Verify the deleted_at timestamp is a valid date-time string
  TestValidator.predicate(
    "deleted_at should be valid ISO date-time",
    typeof deletedComment.deleted_at === "string" &&
      deletedComment.deleted_at.length > 0,
  );

  // Verify comment content is preserved after deletion
  TestValidator.equals(
    "comment content should be preserved",
    deletedComment.content,
    commentContent,
  );

  // Verify comment ID remains the same
  TestValidator.equals(
    "comment ID should remain unchanged",
    deletedComment.id,
    comment.id,
  );
}
