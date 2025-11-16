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
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test moderator capabilities to update article categories regardless of
 * original author. Verify that moderators can reassign categories to any
 * article by updating category associations, enabling content management across
 * the entire discussion platform.
 */
export async function test_api_moderator_article_categories_update_validation(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account for authentication
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: moderatorEmail,
      password_hash: RandomGenerator.alphabets(32),
      moderation_level: "standard",
      email_verified: true,
      two_factor_enabled: false,
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create article with initial categories
  const initialCategoryCodes = [
    typia.random<ICategoryCode>(),
    typia.random<ICategoryCode>(),
  ];

  const createArticleBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_ids: ArrayUtil.repeat(2, () =>
      typia.random<string & tags.Format<"uuid">>(),
    ),
    attachments: [
      {
        filename: "economic_data.pdf",
        file_size: 1024000,
        file_type: "document" as IEconomicDiscussionAttachmentFileType,
        mime_type: "application/pdf",
      },
    ],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      {
        body: createArticleBody,
      },
    );
  typia.assert(article);

  TestValidator.equals(
    "article has initial categories",
    article.categories.length,
    2,
  );

  // Step 3: Update article categories to different categories
  const newCategoryCodes = [
    typia.random<ICategoryCode>(),
    typia.random<ICategoryCode>(),
    typia.random<ICategoryCode>(),
  ];

  const updatedArticle =
    await api.functional.economicDiscussion.moderator.articles.categories.updateCategories(
      connection,
      {
        articleId: article.id,
        body: {
          category_codes: newCategoryCodes,
        } satisfies IEconomicDiscussionArticle.ICategoriesUpdate,
      },
    );
  typia.assert(updatedArticle);

  // Validate that categories were successfully updated
  TestValidator.equals(
    "updated article should have new categories",
    updatedArticle.categories.length,
    3,
  );
  TestValidator.predicate("all new categories are present", () =>
    newCategoryCodes.every((code) =>
      updatedArticle.categories.some((cat) => cat.code === code),
    ),
  );
}
