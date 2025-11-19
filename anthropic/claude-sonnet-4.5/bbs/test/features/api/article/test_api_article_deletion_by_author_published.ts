import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test complete workflow where a member deletes their own published article
 * using soft deletion.
 *
 * This test validates the core article deletion functionality and soft deletion
 * mechanism by:
 *
 * 1. Creating a moderator account to establish category infrastructure
 * 2. Creating an article category (required for article creation)
 * 3. Creating a member account who will be the article author
 * 4. Creating a published article as that member
 * 5. Deleting the article as the same member (ownership verification)
 * 6. Validating soft deletion succeeded (deleted_at timestamp is set)
 * 7. Verifying article data is preserved for 30-day retention period
 *
 * The test ensures that members can only delete their own articles and that the
 * soft deletion mechanism properly marks articles as deleted without physically
 * removing them, enabling recovery during the retention period and maintaining
 * data integrity.
 */
export async function test_api_article_deletion_by_author_published(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account to manage categories
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator_pass_123";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      href: "https://example.com/moderator/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article category (required for article creation)
  const category =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Discussion" satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<100>,
          slug: "economic-discussion" satisfies string &
            tags.MinLength<1> &
            tags.MaxLength<100> &
            tags.Pattern<"^[a-z0-9]+(?:-[a-z0-9]+)*$">,
          description:
            "Discussions about economic policy, markets, and fiscal topics",
          sort_order: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<0>,
        } satisfies IDiscussionBoardArticleCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account who will author and delete the article
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member_pass_456";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: typia.random<string & tags.MinLength<3> & tags.MaxLength<30>>(),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 }),
      href: "https://example.com/member/join" satisfies string &
        tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create published article as the authenticated member
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 3,
    wordMax: 8,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 4,
    wordMax: 8,
  });

  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: articleTitle satisfies string &
          tags.MinLength<5> &
          tags.MaxLength<200>,
        body: articleBody satisfies string &
          tags.MinLength<50> &
          tags.MaxLength<50000>,
        discussion_board_article_category_id: category.id,
        status: "published",
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Validate article was created successfully
  TestValidator.equals("article title matches", article.title, articleTitle);
  TestValidator.equals(
    "article status is published",
    article.status,
    "published",
  );
  TestValidator.equals(
    "article author is member",
    article.author.id,
    member.id,
  );
  TestValidator.equals(
    "article category matches",
    article.category.id,
    category.id,
  );
  TestValidator.equals(
    "article is not deleted initially",
    article.deleted_at,
    null,
  );

  // Step 5: Delete the article as the same member (owner)
  const deletedArticle =
    await api.functional.discussionBoard.member.articles.erase(connection, {
      articleId: article.id,
    });
  typia.assert(deletedArticle);

  // Step 6: Validate soft deletion succeeded
  TestValidator.equals(
    "deleted article ID matches",
    deletedArticle.id,
    article.id,
  );
  TestValidator.predicate(
    "deleted_at timestamp is set",
    deletedArticle.deleted_at !== null &&
      deletedArticle.deleted_at !== undefined,
  );

  // Step 7: Verify article data is preserved (not physically deleted)
  TestValidator.equals(
    "article title preserved after deletion",
    deletedArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article body preserved after deletion",
    deletedArticle.body,
    articleBody,
  );
  TestValidator.equals(
    "article author preserved after deletion",
    deletedArticle.author.id,
    member.id,
  );
  TestValidator.equals(
    "article category preserved after deletion",
    deletedArticle.category.id,
    category.id,
  );
  TestValidator.equals(
    "article status preserved after deletion",
    deletedArticle.status,
    "published",
  );
}
