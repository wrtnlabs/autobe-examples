import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleDocument } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleDocument";
import type { IDiscussionBoardArticleImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleImage";
import type { IDiscussionBoardCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardTag";

/**
 * Test the complete workflow of a member creating and publishing a new article
 * on the discussion board with proper category assignment.
 *
 * This test validates the core content creation functionality, ensuring that
 * authenticated members can successfully create articles with all required
 * fields and that the system properly initializes article metadata.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator to set up category infrastructure
 * 2. Create at least one category (required for article creation)
 * 3. Authenticate as member to establish article author context
 * 4. Create article with title, body, and category assignment
 * 5. Validate article creation success and proper field initialization
 */
export async function test_api_article_creation_by_member_with_category(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to create categories
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create a category as moderator (required for article creation)
  const category: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Authenticate as member to create articles
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberEmail,
        password: RandomGenerator.alphaNumeric(12),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 4: Create article with all required fields
  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 3,
          wordMax: 7,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
        summary: RandomGenerator.paragraph({ sentences: 5 }),
        category_ids: [category.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 5: Validate article creation and proper initialization
  TestValidator.equals(
    "article author matches authenticated member",
    article.discussion_board_member_id,
    member.id,
  );
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );
  TestValidator.equals(
    "article view_count initialized to 0",
    article.view_count,
    0,
  );
  TestValidator.equals(
    "article comment_count initialized to 0",
    article.comment_count,
    0,
  );
  TestValidator.predicate(
    "article has at least one category",
    article.categories.length >= 1,
  );
  TestValidator.equals(
    "article category matches created category",
    article.categories[0].id,
    category.id,
  );
  TestValidator.equals(
    "article author summary matches member",
    article.author.id,
    member.id,
  );
  TestValidator.equals(
    "article has no moderator modification",
    article.last_modified_by_moderator_id,
    null,
  );
}
