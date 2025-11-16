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
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

export async function test_api_moderator_article_categories_cross_author(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account for administrative access
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorUsername = RandomGenerator.name(1)
    .replace(/\s/g, "_")
    .toLowerCase();

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: moderatorUsername,
      email: moderatorEmail,
      password_hash: "securePassword123",
      email_verified: true,
      two_factor_enabled: false,
      moderation_level: "standard",
    } satisfies IEconomicDiscussionModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Create a member account to author content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.name(1)
    .replace(/\s/g, "_")
    .toLowerCase();

  await api.functional.auth.member.join(connection, {
    body: {
      username: memberUsername,
      email: memberEmail,
      password: "memberPassword123",
      email_verified: true,
    } satisfies IEconomicDiscussionMember.ICreate,
  });

  // Step 3: Have the member create an article with initial categories
  const categoryIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: RandomGenerator.name(3),
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 3,
          sentenceMax: 6,
        }),
        category_ids: categoryIds,
        attachments: undefined,
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(article);

  // Step 4: As moderator, update the categories to reorganize the content
  const newCategories = ArrayUtil.repeat(
    3,
    () => "CAT" + RandomGenerator.alphabets(10).toUpperCase(),
  );
  const updatedArticle =
    await api.functional.economicDiscussion.moderator.articles.categories.updateCategories(
      connection,
      {
        articleId: article.id,
        body: {
          category_codes: newCategories,
        } satisfies IEconomicDiscussionArticle.ICategoriesUpdate,
      },
    );
  typia.assert(updatedArticle);

  // Step 5: Verify that the category update was successful
  TestValidator.equals("article remains same", updatedArticle.id, article.id);
  TestValidator.equals(
    "categories updated properly",
    updatedArticle.categories.length,
    3,
  );
  TestValidator.equals(
    "new categories match",
    JSON.stringify(updatedArticle.categories.map((c) => c.code).sort()),
    JSON.stringify(newCategories.sort()),
  );
}
