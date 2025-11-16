import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerator";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

export async function test_api_moderator_detach_category_admin(
  connection: api.IConnection,
) {
  // Step 1: Register moderator account with administrative privileges
  const username = RandomGenerator.name(2).replace(/ /g, "_"); // Create username from name with underscores
  const moderatorCreateRequest = {
    username: username,
    email: RandomGenerator.name(1) + "@discussion.example.com",
    password_hash: RandomGenerator.alphaNumeric(64), // Generate secure hash
    email_verified: false,
    two_factor_enabled: false,
    moderation_level: "admin", // Set high privilege level
  } satisfies IEconomicDiscussionModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorCreateRequest,
  });
  typia.assert(moderator);

  // Step 2: Create economic discussion category for article organization
  const categoryCode = RandomGenerator.alphabets(15).toLowerCase(); // Generate unique category code
  const categoryCreateRequest = {
    code: categoryCode,
    name: "Economic Policy Analysis & Political Discussion",
    description:
      "Comprehensive category for economic insights, market analysis, and policy debates",
    display_order: 1,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category1 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: categoryCreateRequest },
    );
  typia.assert(category1);

  // Step 3: Create second category for multi-category testing
  const categoryCode2 = RandomGenerator.alphabets(12).toLowerCase();
  const categoryCreateRequest2 = {
    code: categoryCode2,
    name: "Political Science Commentary",
    description:
      "Discussions on political theory, governance, and democratic processes",
    display_order: 2,
    is_active: true,
  } satisfies IEconomicDiscussionCategory.ICreate;

  const category2 =
    await api.functional.economicDiscussion.moderator.categories.create(
      connection,
      { body: categoryCreateRequest2 },
    );
  typia.assert(category2);

  // Step 4: Create article with multiple category assignments as moderator
  const articleTitle = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 8,
    wordMax: 15,
  });
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 18,
    wordMin: 4,
    wordMax: 9,
  });

  const articlesCreateRequest = {
    title: articleTitle,
    content: articleContent,
    category_ids: [category1.id, category2.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.moderator.articles.create(
      connection,
      { body: articlesCreateRequest },
    );
  typia.assert(article);

  // Step 5: Validate both categories are properly assigned
  TestValidator.predicate(
    "article should have two categories attached",
    article.categories.length === 2,
  );

  // Step 6: Demonstrate moderator administrative privilege by detaching category
  await api.functional.economicDiscussion.moderator.articles.categories.detachCategory(
    connection,
    {
      articleId: article.id,
      categoryCode: category1.code,
    },
  );

  // Step 7: Detach second category
  await api.functional.economicDiscussion.moderator.articles.categories.detachCategory(
    connection,
    {
      articleId: article.id,
      categoryCode: category2.code,
    },
  );

  // Step 8: Validate moderator authentication succeeded with proper permissions
  TestValidator.equals(
    "moderator email matches registration",
    moderator.email,
    moderatorCreateRequest.email,
  );
  TestValidator.equals(
    "category1 was created successfully",
    category1.code,
    categoryCode,
  );
  TestValidator.equals(
    "category2 was created successfully",
    category2.code,
    categoryCode2,
  );
}
