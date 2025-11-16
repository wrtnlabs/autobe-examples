import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICategoryCode } from "@ORGANIZATION/PROJECT-api/lib/structures/ICategoryCode";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

export async function test_api_member_article_categories_update_multiple(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member to establish authorization
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: "economicAnalyst123",
      email: "analyst@economist.com",
      password: "securePassword123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 2: Create an article with two initial categories
  const categoryIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  const initialArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "The Impact of Interest Rates on GDP Growth",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 8,
          sentenceMax: 15,
        }),
        category_ids: categoryIds,
        attachments: [],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(initialArticle);

  // Step 3: Update article categories with completely different four-category set
  const updatedArticleSummary =
    await api.functional.economicDiscussion.member.articles.categories.updateCategories(
      connection,
      {
        articleId: initialArticle.id,
        body: {
          category_codes: ArrayUtil.repeat(4, () =>
            RandomGenerator.alphabets(8).toUpperCase(),
          ),
        } satisfies IEconomicDiscussionArticle.ICategoriesUpdate,
      },
    );
  typia.assert(updatedArticleSummary);

  // Step 4: Verify the update replaced categories correctly
  TestValidator.equals(
    "Updated article ID matches original",
    updatedArticleSummary.id,
    initialArticle.id,
  );
  TestValidator.equals(
    "Updated article title matches",
    updatedArticleSummary.title,
    initialArticle.title,
  );
  TestValidator.equals(
    "Article has 4 categories after update",
    updatedArticleSummary.categories.length,
    4,
  );
  TestValidator.predicate(
    "All categories have valid codes",
    updatedArticleSummary.categories.every(
      (cat) => typeof cat.code === "string" && cat.code.length > 0,
    ),
  );

  // Step 5: Test updating to a single category
  const singleCategorySummary =
    await api.functional.economicDiscussion.member.articles.categories.updateCategories(
      connection,
      {
        articleId: initialArticle.id,
        body: {
          category_codes: [RandomGenerator.alphabets(6).toUpperCase()],
        } satisfies IEconomicDiscussionArticle.ICategoriesUpdate,
      },
    );
  typia.assert(singleCategorySummary);

  TestValidator.equals(
    "Article has one category",
    singleCategorySummary.categories.length,
    1,
  );
  TestValidator.predicate(
    "Single category has valid code",
    typeof singleCategorySummary.categories[0].code === "string" &&
      singleCategorySummary.categories[0].code.length > 0,
  );
}
