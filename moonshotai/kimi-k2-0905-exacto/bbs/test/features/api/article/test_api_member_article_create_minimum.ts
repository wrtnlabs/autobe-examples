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
 * Test member article creation with minimum valid data - single category
 * assignment.
 *
 * This test validates the most basic article creation scenario where an
 * authenticated member creates an article with the minimum required fields:
 *
 * 1. A valid title introducing the discussion topic (1-500 characters)
 * 2. Substantive content body with economic discussion (10-50,000 characters)
 * 3. At least one category assignment for content organization
 *
 * The test verifies that the system accepts this minimal input and creates the
 * article with automatic defaults:
 *
 * - Version is initialized to 1.0 (starting version number)
 * - Status is set to "pending" for moderation workflow
 * - View count starts at 0 for new articles
 * - Timestamps are automatically recorded for audit trail
 *
 * This ensures the article creation process works end-to-end with the simplest
 * meaningful data while maintaining system standards for content quality and
 * organization.
 */
export async function test_api_member_article_create_minimum(
  connection: api.IConnection,
) {
  // Step 1: Register a new member to establish authentication context
  const memberData = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const memberAuth: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(memberAuth);

  // Verify member creation successful
  TestValidator.predicate(
    "member has valid UUID ID",
    typia.is<string & tags.Format<"uuid">>(memberAuth.member.id),
  );
  TestValidator.equals(
    "member username matches",
    memberAuth.member.username,
    memberData.username,
  );
  TestValidator.equals(
    "member email matches",
    memberAuth.member.email,
    memberData.email,
  );

  // Step 2: Create article with minimum required fields
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
    content: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Validate article creation with proper defaults
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
  TestValidator.predicate(
    "article has valid UUID ID",
    typia.is<string & tags.Format<"uuid">>(createdArticle.id),
  );
  TestValidator.equals("article version is 1.0", createdArticle.version, 1);
  TestValidator.equals(
    "article status is pending",
    createdArticle.status,
    "pending",
  );
  TestValidator.equals("article view count 0", createdArticle.view_count, 0);
  TestValidator.predicate(
    "article has creation timestamp",
    createdArticle.created_at !== null,
  );
  TestValidator.predicate(
    "article has update timestamp",
    createdArticle.updated_at !== null,
  );
  TestValidator.equals(
    "single article category",
    createdArticle.categories.length,
    1,
  );
  TestValidator.equals(
    "article category ID matches",
    createdArticle.categories[0].id,
    articleData.category_ids[0],
  );
}
