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

export async function test_api_comment_soft_delete_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create category with moderator context (assuming moderator pre-authentication)
  // Note: The connection must have moderator authentication at this point
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: `Test Category ${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(8),
      email: memberEmail,
      password: "TestPass123!@#",
      href: "https://test.example.com/signup" satisfies string &
        tags.Format<"uri">,
      referrer: "https://test.example.com/" satisfies string &
        tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.IJoin,
  });
  typia.assert(member);

  // Step 3: Create article as authenticated member
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
        summary: RandomGenerator.paragraph({ sentences: 2 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Verify initial comment count is 0
  TestValidator.equals("initial comment count is 0", article.comment_count, 0);

  // Step 4: Post comment on the article
  const comment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(comment);

  // Verify comment was created successfully
  TestValidator.equals(
    "comment article id matches",
    comment.discussion_board_article_id,
    article.id,
  );
  TestValidator.equals(
    "comment deleted_at is null initially",
    comment.deleted_at,
    null,
  );

  // Step 5: Soft-delete the comment as the member who created it
  const deletedComment =
    await api.functional.discussionBoard.member.articles.comments.erase(
      connection,
      {
        articleId: article.id,
        commentId: comment.id,
      },
    );
  typia.assert(deletedComment);

  // Step 6: Verify soft deletion occurred correctly
  TestValidator.equals(
    "deleted comment id matches original",
    deletedComment.id,
    comment.id,
  );
  TestValidator.predicate(
    "deleted_at timestamp is set after deletion",
    deletedComment.deleted_at !== null &&
      deletedComment.deleted_at !== undefined,
  );

  // Verify the deleted_at is a valid ISO 8601 date-time string
  if (deletedComment.deleted_at) {
    const deletedAtDate = new Date(deletedComment.deleted_at);
    TestValidator.predicate(
      "deleted_at is a valid date-time",
      !isNaN(deletedAtDate.getTime()),
    );

    // Verify deletion timestamp is recent (within last minute)
    const now = new Date();
    const timeDiff = now.getTime() - deletedAtDate.getTime();
    TestValidator.predicate(
      "deletion timestamp is recent",
      timeDiff >= 0 && timeDiff < 60000,
    );
  }

  // Verify comment content is preserved after soft deletion
  TestValidator.equals(
    "comment content preserved after deletion",
    deletedComment.content,
    comment.content,
  );
}
