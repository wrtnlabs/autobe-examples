import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICrIPageIntegerRequired } from "@ORGANIZATION/PROJECT-api/lib/structures/ICrIPageIntegerRequired";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategory";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEconomicDiscussionCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEconomicDiscussionCategory";

export async function test_api_member_article_creation_with_single_category(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member to establish authentication
  const username = RandomGenerator.alphaNumeric(8);
  const email = `test_${RandomGenerator.alphaNumeric(6)}@example.com`;
  const password = "TestPass123";

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username,
      email,
      password,
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Discover available categories to select a valid category ID
  const categoryRequest = {
    limit: 10,
  } satisfies IEconomicDiscussionCategory.IRequest;

  const categoryPage = await api.functional.economicDiscussion.categories.index(
    connection,
    {
      body: categoryRequest,
    },
  );
  typia.assert(categoryPage);

  // Validate we have at least one available category
  TestValidator.predicate(
    "categories exist for selection",
    categoryPage.data.length > 0,
  );

  // Select the first available category
  const selectedCategory = categoryPage.data[0];

  // Step 3: Create an article with a single category assignment
  const articleTitle = RandomGenerator.name(3);
  const articleContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 4,
    wordMax: 8,
  });

  const articleCreateBody = {
    title: articleTitle,
    content: articleContent,
    category_ids: [selectedCategory.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(createdArticle);

  // Step 4: Validate that the article maintains proper categorization metadata
  TestValidator.predicate("article ID is valid", createdArticle.id.length > 0);
  TestValidator.equals(
    "article title matches input",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches input",
    createdArticle.content,
    articleContent,
  );

  // Validate category assignment was successful
  TestValidator.predicate(
    "article has exactly one category",
    createdArticle.categories.length === 1,
  );
  TestValidator.equals(
    "article category ID matches selected category",
    createdArticle.categories[0].id,
    selectedCategory.id,
  );
  TestValidator.equals(
    "article category name matches selected category",
    createdArticle.categories[0].name,
    selectedCategory.name,
  );
  TestValidator.equals(
    "article category code matches selected category",
    createdArticle.categories[0].code,
    selectedCategory.code,
  );

  // Verify initial article status is pending for moderation
  TestValidator.equals(
    "article status is pending",
    createdArticle.status,
    "pending",
  );
  TestValidator.equals(
    "article version starts at 1",
    createdArticle.version,
    1,
  );
  TestValidator.equals(
    "article view count starts at 0",
    createdArticle.view_count,
    0,
  );
  TestValidator.predicate(
    "article has creation timestamp",
    createdArticle.created_at.length > 0,
  );
  TestValidator.predicate(
    "article has update timestamp",
    createdArticle.updated_at.length > 0,
  );
}
