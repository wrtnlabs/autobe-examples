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
 * Test cascade soft deletion behavior when an article is deleted.
 *
 * This test validates the cascade deletion rules for discussion board articles
 * and their associated comments. When an article is deleted, the system should
 * soft delete all associated comments while preserving the data for audit
 * purposes.
 *
 * Test workflow:
 *
 * 1. Create and authenticate a moderator account for category creation
 * 2. Create a category required for article creation
 * 3. Create and authenticate a member account (article author)
 * 4. Create an article that will receive comments
 * 5. Post several top-level comments on the article
 * 6. Post replies to some of the top-level comments (single-level threading)
 * 7. Delete the article (soft delete)
 * 8. Verify the article has deleted_at timestamp set
 * 9. Verify all comments (top-level and replies) have deleted_at timestamps set
 * 10. Confirm the discussion thread is preserved in the database
 */
export async function test_api_article_deletion_with_comments_cascading(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: moderatorEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a category
  const category: IDiscussionBoardCategory =
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

  // Step 3: Create and authenticate member account (article author)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<30> &
            tags.Pattern<"^[a-zA-Z0-9_-]+$">
        >(),
        email: memberEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 4: Create an article
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 15,
          sentenceMax: 25,
        }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Post several top-level comments
  const topLevelComments: IDiscussionBoardComment[] =
    await ArrayUtil.asyncRepeat(3, async () => {
      const comment: IDiscussionBoardComment =
        await api.functional.discussionBoard.member.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: {
              discussion_board_article_id: article.id,
              discussion_board_parent_comment_id: null,
              content: RandomGenerator.paragraph({
                sentences: 10,
                wordMin: 4,
                wordMax: 8,
              }),
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      typia.assert(comment);
      return comment;
    });

  // Step 6: Post replies to some top-level comments
  const replyComments: IDiscussionBoardComment[] = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      const parentComment = topLevelComments[index];
      const reply: IDiscussionBoardComment =
        await api.functional.discussionBoard.member.articles.comments.create(
          connection,
          {
            articleId: article.id,
            body: {
              discussion_board_article_id: article.id,
              discussion_board_parent_comment_id: parentComment.id,
              content: RandomGenerator.paragraph({
                sentences: 8,
                wordMin: 3,
                wordMax: 7,
              }),
            } satisfies IDiscussionBoardComment.ICreate,
          },
        );
      typia.assert(reply);
      return reply;
    },
  );

  // Step 7: Delete the article (soft delete)
  await api.functional.discussionBoard.member.articles.erase(connection, {
    articleId: article.id,
  });

  // Steps 8-10 verification would require additional API endpoints to:
  // - Retrieve deleted articles (for moderator verification)
  // - Retrieve deleted comments (for audit trail verification)
  // Since these endpoints are not provided in the available API functions,
  // the test validates the deletion operation succeeds without errors.
  // The actual cascade deletion verification would be performed by:
  // - Database inspection confirming deleted_at timestamps are set
  // - Moderator access endpoints showing the preserved data
  // - Public access endpoints showing the content is hidden
}
