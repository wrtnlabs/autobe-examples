import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconomicDiscussionArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionArticle";
import type { IEconomicDiscussionAttachmentFileType } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachmentFileType";
import type { IEconomicDiscussionAttachments } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionAttachments";
import type { IEconomicDiscussionCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionCategories";
import type { IEconomicDiscussionMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMember";
import type { IEconomicDiscussionMembers } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionMembers";
import type { IEconomicDiscussionModerators } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconomicDiscussionModerators";

/**
 * Test article creation with category assignment validation.
 *
 * This test validates that articles must be assigned to valid categories for
 * proper content organization and discoverability. It ensures the system
 * enforces category requirements during article creation.
 *
 * Test flow:
 *
 * 1. Register a new member account for authentication
 * 2. Create an article with valid category assignment
 * 3. Validate that the article is created successfully with proper categorization
 * 4. Verify category_ids field contains valid UUIDs and meets minimum requirements
 */
export async function test_api_economic_article_creation_category_validation(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: typia.random<string & tags.Format<"email">>() satisfies string,
      password: "SecurePass123!",
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 2: Create article with valid category assignment
  const categoryIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
    category_ids: categoryIds,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Validate article creation with categories
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches",
    createdArticle.content,
    articleData.content,
  );
  TestValidator.equals(
    "article has expected number of categories",
    createdArticle.categories.length,
    articleData.category_ids.length,
  );

  // Step 4: Validate category assignment and article properties
  TestValidator.predicate(
    "categories array is not empty",
    createdArticle.categories.length > 0,
  );
  TestValidator.predicate(
    "all categories have valid UUID format",
    createdArticle.categories.every((cat) =>
      typia.is<string & tags.Format<"uuid">>(cat.id),
    ),
  );
  TestValidator.predicate(
    "article status is pending",
    createdArticle.status === "pending",
  );
  TestValidator.predicate(
    "article version starts at 1",
    createdArticle.version === 1,
  );
  TestValidator.predicate(
    "view count starts at 0",
    createdArticle.view_count === 0,
  );
  TestValidator.predicate(
    "article has creation timestamp",
    typia.is<string & tags.Format<"date-time">>(createdArticle.created_at) ===
      true,
  );
  TestValidator.predicate(
    "article has update timestamp",
    typia.is<string & tags.Format<"date-time">>(createdArticle.updated_at) ===
      true,
  );
}
