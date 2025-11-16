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
 * Test basic article creation with valid title, content, and category
 * assignment. This scenario validates the core article publishing functionality
 * for economic discussion board members. Creates an article with standard
 * economic analysis content, assigns appropriate categories, and verifies
 * successful creation with generated metadata including version 1.0
 * initialization and pending moderation status.
 *
 * The test follows this workflow:
 *
 * 1. Create a new member account to ensure authentication
 * 2. Create an article with economic discussion content, including proper
 *    categorization
 * 3. Verify the article is created with correct initial properties (version 1.0,
 *    pending status)
 * 4. Validate that the response contains expected article metadata and author
 *    information
 */
export async function test_api_economic_article_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberCreateBody = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "ValidPassword123",
  } satisfies IEconomicDiscussionMember.ICreate;

  const member: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(member);

  // Step 2: Create article with economic discussion content
  const articleTitle = RandomGenerator.name(2);
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 15,
    wordMin: 4,
    wordMax: 8,
  });

  // Create at least one category ID for the article
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const articleCreateBody = {
    title: articleTitle,
    content: articleContent,
    category_ids: [categoryId],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleCreateBody,
    });
  typia.assert(article);

  // Step 3: Verify article creation with expected properties
  TestValidator.equals(
    "article title matches input",
    article.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches input",
    article.content,
    articleContent,
  );
  TestValidator.equals("article has correct version", article.version, 1.0);
  TestValidator.equals("article has pending status", article.status, "pending");
  TestValidator.equals("article has zero view count", article.view_count, 0);
  TestValidator.equals(
    "article has one category",
    article.categories.length,
    1,
  );
  TestValidator.equals(
    "category ID matches",
    article.categories[0]?.id,
    categoryId,
  );

  // Verify metadata is properly set
  TestValidator.predicate("article has valid ID", () => article.id !== "");
  TestValidator.predicate(
    "article has creation timestamp",
    () => article.created_at !== undefined,
  );
  TestValidator.predicate(
    "article has update timestamp",
    () => article.updated_at !== undefined,
  );
  TestValidator.predicate(
    "article timestamps are valid ISO format",
    () =>
      typia.is<string & tags.Format<"date-time">>(article.created_at) &&
      typia.is<string & tags.Format<"date-time">>(article.updated_at),
  );

  // Verify no author is set initially (as specified in response structure)
  TestValidator.equals(
    "article has no member author",
    article.member_author,
    undefined,
  );
  TestValidator.equals(
    "article has no member author profile",
    article.member_author_profile,
    undefined,
  );
}
