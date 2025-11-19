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
 * Test article creation workflow when multiple categories exist in the system.
 *
 * This test validates that members can correctly select from available
 * categories and that the article is properly associated with the chosen
 * category. Creates multiple categories (Economic Discussion, Political
 * Discussion, General Discussion) and verifies that articles can be created
 * under each category correctly. Validates that the category association is
 * properly stored and that the article's category field contains complete
 * category information including name, slug, and description in the response.
 *
 * Test Steps:
 *
 * 1. Create moderator account for category management
 * 2. Create three test categories with different topics
 * 3. Create member account for article authoring
 * 4. Create articles under each category
 * 5. Validate category associations and complete category data in responses
 */
export async function test_api_article_creation_multiple_categories(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "moderator123!";

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      ip: "127.0.0.1",
      href: "https://example.com/moderator/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create multiple test categories
  const categoryData = [
    {
      name: "Economic Discussion",
      slug: "economic-discussion",
      description:
        "Discussions about economic policies, markets, and fiscal topics",
      sort_order: 1,
    },
    {
      name: "Political Discussion",
      slug: "political-discussion",
      description:
        "Discussions about governance, elections, and political systems",
      sort_order: 2,
    },
    {
      name: "General Discussion",
      slug: "general-discussion",
      description: "General topics and open discussions",
      sort_order: 3,
    },
  ];

  const categories = await ArrayUtil.asyncMap(categoryData, async (data) => {
    const category =
      await api.functional.discussionBoard.moderator.categories.create(
        connection,
        {
          body: data satisfies IDiscussionBoardArticleCategory.ICreate,
        },
      );
    typia.assert(category);
    return category;
  });

  TestValidator.equals("created three categories", categories.length, 3);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "member123!";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: RandomGenerator.alphaNumeric(10),
      display_name: RandomGenerator.name(2),
      bio: RandomGenerator.paragraph({ sentences: 5 }),
      ip: "127.0.0.1",
      href: "https://example.com/member/join",
      referrer: "https://example.com",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 4 & 5: Create articles under each category and validate
  const articles = await ArrayUtil.asyncMap(categories, async (category) => {
    const articleTitle = `Article in ${category.name}`;
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
          title: articleTitle,
          body: articleBody,
          discussion_board_article_category_id: category.id,
          status: "published",
        } satisfies IDiscussionBoardArticle.ICreate,
      },
    );
    typia.assert(article);

    // Validate category association
    TestValidator.equals(
      "article category id matches",
      article.category.id,
      category.id,
    );

    TestValidator.equals(
      "article category name matches",
      article.category.name,
      category.name,
    );

    TestValidator.equals(
      "article category slug matches",
      article.category.slug,
      category.slug,
    );

    TestValidator.equals(
      "article category description matches",
      article.category.description,
      category.description,
    );

    TestValidator.equals(
      "article category sort_order matches",
      article.category.sort_order,
      category.sort_order,
    );

    TestValidator.equals(
      "article status is published",
      article.status,
      "published",
    );

    TestValidator.predicate("article has valid UUID", article.id.length > 0);

    return article;
  });

  TestValidator.equals(
    "created three articles across categories",
    articles.length,
    3,
  );
}
