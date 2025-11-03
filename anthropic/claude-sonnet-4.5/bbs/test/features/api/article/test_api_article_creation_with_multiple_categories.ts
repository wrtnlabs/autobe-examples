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
 * Test article creation with multiple category assignments.
 *
 * This scenario validates that members can create articles associated with
 * multiple categories from the predefined economic and political topic
 * categories. The test verifies that the article-category relationships are
 * properly established in the discussion_board_article_categories junction
 * table and that all selected categories appear correctly when retrieving the
 * article.
 *
 * Test workflow:
 *
 * 1. Authenticate as moderator and create multiple test categories
 * 2. Switch to member authentication
 * 3. Create an article with multiple category assignments
 * 4. Validate that all categories are correctly associated with the article
 */
export async function test_api_article_creation_with_multiple_categories(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator to create categories
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: moderatorEmail,
        password: "SecurePass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create first category for economics
  const economicsCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Economic Policy",
          description:
            "Discussions about fiscal policy, monetary policy, trade, and economic regulations",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(economicsCategory);

  // Step 3: Create second category for politics
  const politicsCategory: IDiscussionBoardCategory =
    await api.functional.discussionBoard.moderator.categories.create(
      connection,
      {
        body: {
          name: "Political Analysis",
          description:
            "Analysis of political systems, governance, and policy decisions",
        } satisfies IDiscussionBoardCategory.ICreate,
      },
    );
  typia.assert(politicsCategory);

  // Step 4: Switch to member authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(8),
        email: memberEmail,
        password: "MemberPass123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardMember.IJoin,
    });
  typia.assert(member);

  // Step 5: Create article with multiple categories
  const articleTitle =
    "The Intersection of Monetary Policy and Political Reform";
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: {
        title: articleTitle,
        body: articleBody,
        summary:
          "Analysis of how central bank policies influence political decision-making",
        category_ids: [economicsCategory.id, politicsCategory.id],
      } satisfies IDiscussionBoardArticle.ICreate,
    });
  typia.assert(article);

  // Step 6: Validate article creation and category associations
  TestValidator.equals("article title matches", article.title, articleTitle);
  TestValidator.equals(
    "article has correct number of categories",
    article.categories.length,
    2,
  );

  // Step 7: Verify both categories are present in the article
  const categoryIds = article.categories.map((c) => c.id);
  TestValidator.predicate(
    "economics category is assigned",
    categoryIds.includes(economicsCategory.id),
  );
  TestValidator.predicate(
    "politics category is assigned",
    categoryIds.includes(politicsCategory.id),
  );

  // Step 8: Validate category details are complete
  const foundEconomicsCategory = article.categories.find(
    (c) => c.id === economicsCategory.id,
  );
  if (foundEconomicsCategory) {
    typia.assert(foundEconomicsCategory!);
    TestValidator.equals(
      "economics category name matches",
      foundEconomicsCategory.name,
      "Economic Policy",
    );
  }

  const foundPoliticsCategory = article.categories.find(
    (c) => c.id === politicsCategory.id,
  );
  if (foundPoliticsCategory) {
    typia.assert(foundPoliticsCategory!);
    TestValidator.equals(
      "politics category name matches",
      foundPoliticsCategory.name,
      "Political Analysis",
    );
  }
}
