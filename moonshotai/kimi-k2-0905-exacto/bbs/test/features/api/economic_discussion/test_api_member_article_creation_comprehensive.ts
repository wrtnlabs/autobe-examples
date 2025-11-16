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
 * Test advanced article creation with complex categorization and content
 * structure.
 *
 * This comprehensive test validates member ability to create sophisticated
 * economic analysis articles with multiple category assignments and detailed
 * content.
 *
 * Test flow:
 *
 * 1. Register a new member account with valid credentials
 * 2. Create economic analysis article with multiple categories and detailed
 *    content
 * 3. Validate article structure, content requirements, and category assignments
 * 4. Test moderate attachments and rich content formatting
 */
export async function test_api_member_article_creation_comprehensive(
  connection: api.IConnection,
) {
  // Register new member account
  const username = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 3,
    wordMax: 8,
  });
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.content({
    paragraphs: 1,
    sentenceMin: 8,
    sentenceMax: 12,
  });

  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: username,
      email: email,
      password: password.substring(0, 64),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  TestValidator.predicate(
    "member authentication token generated",
    member.access_token.length > 0,
  );
  TestValidator.equals(
    "registered username matches input",
    member.member.username,
    username,
  );
  TestValidator.equals(
    "registered email matches input",
    member.member.email,
    email,
  );

  // Create realistic category IDs that would exist in the system
  // Since we can't generate random valid categories, create a small set
  const fiscalPolicyCategoryId = "550e8400-e29b-41d4-a716-446655440000";
  const monetaryPolicyCategoryId = "660e8400-e29b-41d4-a716-446655440001";
  const internationalTradeCategoryId = "770e8400-e29b-41d4-a716-446655440002";

  const categoryIds = [
    fiscalPolicyCategoryId,
    monetaryPolicyCategoryId,
    internationalTradeCategoryId,
  ];

  // Create comprehensive economic analysis article
  const articleTitles = [
    "Fiscal Policy Impact on Economic Growth: A Comprehensive Analysis",
    "Monetary Policy and Inflation: Evaluating Central Bank Strategies",
    "International Trade Dynamics in a Globalized Economy",
    "Economic Recovery Patterns: Lessons from Recent Recessions",
  ] as const;

  const finalTitle = RandomGenerator.pick(articleTitles);

  const articleContent = RandomGenerator.content({
    paragraphs: 8,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 10,
  });

  // Create attachments for supporting economic data
  const attachments = [
    {
      file_size: 5242880,
      file_type: RandomGenerator.pick([
        "document",
        "spreadsheet",
        "image",
      ] as const),
      filename: "economic_analysis_whitepaper.pdf",
      mime_type: "application/pdf",
    },
  ];

  const articleCreate =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: finalTitle,
        content: articleContent,
        category_ids: categoryIds,
        attachments: attachments,
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(articleCreate);

  // Validate article structure and content
  TestValidator.equals(
    "article title matches creation data",
    articleCreate.title,
    finalTitle,
  );
  TestValidator.equals(
    "article content matches creation data",
    articleCreate.content,
    articleContent,
  );
  TestValidator.equals(
    "article status is pending",
    articleCreate.status,
    "pending",
  );
  TestValidator.equals(
    "initial view count is zero",
    articleCreate.view_count,
    0,
  );
  TestValidator.equals("initial version is zero", articleCreate.version, 0);
  TestValidator.predicate(
    "has correct number of categories",
    articleCreate.categories.length === categoryIds.length,
  );

  // Validate timestamps
  TestValidator.predicate(
    "created_at timestamp exists",
    articleCreate.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp exists",
    articleCreate.updated_at.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid ISO date",
    !isNaN(Date.parse(articleCreate.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid ISO date",
    !isNaN(Date.parse(articleCreate.updated_at)),
  );

  // Validate content length requirements
  TestValidator.predicate(
    "title meets minimum length",
    articleCreate.title.length >= 1,
  );
  TestValidator.predicate(
    "title meets maximum length",
    articleCreate.title.length <= 500,
  );
  TestValidator.predicate(
    "content meets minimum length",
    articleCreate.content.length >= 10,
  );
  TestValidator.predicate(
    "content meets maximum length",
    articleCreate.content.length <= 50000,
  );

  // Validate article metadata
  if (articleCreate.categories.length > 0) {
    const firstCategory = articleCreate.categories[0];
    TestValidator.predicate(
      "first category has valid ID",
      firstCategory.id.length > 0,
    );
    TestValidator.predicate(
      "first category has name",
      firstCategory.name.length > 0,
    );
    TestValidator.predicate(
      "category active status is boolean",
      typeof firstCategory.is_active === "boolean",
    );
    TestValidator.predicate(
      "category article count is non-negative",
      firstCategory.article_count >= 0,
    );
    TestValidator.predicate(
      "category display order is number",
      typeof firstCategory.display_order === "number",
    );
    TestValidator.predicate(
      "category code exists",
      firstCategory.code.length > 0,
    );
  }

  // Validate author attribution
  if (articleCreate.member_author) {
    TestValidator.predicate(
      "member author ID exists",
      articleCreate.member_author.length > 0,
    );
    TestValidator.predicate(
      "moderator author is null",
      articleCreate.moderator_author === null,
    );
    TestValidator.predicate(
      "member profile exists",
      articleCreate.member_author_profile !== undefined,
    );
  }
}
