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
 * Validates single-level threading constraint enforcement in comment replies.
 *
 * This test ensures that the discussion board comment system properly enforces
 * the single-level threading model by preventing nested replies beyond the
 * first level. The system should allow top-level comments and first-level
 * replies, but reject attempts to create replies to replies (second-level
 * nesting).
 *
 * Test workflow:
 *
 * 1. Create moderator account and authenticate
 * 2. Create category for article classification
 * 3. Create member account and authenticate
 * 4. Create article for comment thread
 * 5. Create top-level comment on the article
 * 6. Create first-level reply to the top-level comment (should succeed)
 * 7. Attempt to create second-level reply to the first-level reply (should fail)
 * 8. Validate that the threading constraint is properly enforced
 */
export async function test_api_comment_reply_threading_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator for category management
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
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

  // Step 2: Create category for article organization
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<255>
          >(),
          description: typia.random<string & tags.MaxLength<2000>>(),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create and authenticate member for article and comment creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
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

  // Step 4: Create article for comment thread
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: typia.random<string & tags.MinLength<5> & tags.MaxLength<200>>(),
        body: typia.random<
          string & tags.MinLength<20> & tags.MaxLength<50000>
        >(),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 5: Create top-level comment (parent comment with null parent_comment_id)
  const topLevelComment =
    await api.functional.discussionBoard.member.articles.comments.create(
      connection,
      {
        articleId: article.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: null,
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<5000>
          >(),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(topLevelComment);

  // Step 6: Create first-level reply to top-level comment (should succeed)
  const firstLevelReply =
    await api.functional.discussionBoard.member.articles.comments.replies.create(
      connection,
      {
        articleId: article.id,
        commentId: topLevelComment.id,
        body: {
          discussion_board_article_id: article.id,
          discussion_board_parent_comment_id: topLevelComment.id,
          content: typia.random<
            string & tags.MinLength<1> & tags.MaxLength<5000>
          >(),
        } satisfies IDiscussionBoardComment.ICreate,
      },
    );
  typia.assert(firstLevelReply);

  // Step 7: Attempt to create second-level reply (should fail due to threading constraint)
  await TestValidator.error(
    "second-level reply should be rejected due to single-level threading constraint",
    async () => {
      await api.functional.discussionBoard.member.articles.comments.replies.create(
        connection,
        {
          articleId: article.id,
          commentId: firstLevelReply.id,
          body: {
            discussion_board_article_id: article.id,
            discussion_board_parent_comment_id: firstLevelReply.id,
            content: typia.random<
              string & tags.MinLength<1> & tags.MaxLength<5000>
            >(),
          } satisfies IDiscussionBoardComment.ICreate,
        },
      );
    },
  );
}
