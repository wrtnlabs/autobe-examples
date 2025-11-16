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
 * Test member article creation workflow.
 *
 * Validates the complete process from member registration to article creation
 * with proper authorization and content validation. Tests that the system
 * correctly handles new member registration, assigns appropriate
 * authentication, and allows article creation with proper content
 * categorization.
 *
 * Flow:
 *
 * 1. Register new member account with valid credentials
 * 2. Use created authentication for article creation
 * 3. Create comprehensive article with title, content, and categorization
 * 4. Validate article properties and moderation workflow status
 */
export async function test_api_member_article_creation_basic(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    username: RandomGenerator.name(2).replace(/\s+/g, "_"),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    email_verified: false,
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  TestValidator.equals(
    "member username matches",
    member.member.username,
    memberData.username,
  );
  TestValidator.predicate(
    "member has completion ID",
    typeof member.member.id === "string" && member.member.id.length > 0,
  );

  // Step 2: Prepare article content
  const categoryIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];

  const articleContent = {
    title: `Analysis: ${RandomGenerator.paragraph({ sentences: 3 })}`,
    content: RandomGenerator.content({
      paragraphs: 4,
      sentenceMin: 20,
      sentenceMax: 30,
    }),
    category_ids: categoryIds,
    attachments: [],
  } satisfies IEconomicDiscussionArticle.ICreate;

  // Step 3: Create the article as authenticated member
  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleContent,
    });
  typia.assert(article);

  // Step 4: Validate article properties and status
  TestValidator.equals(
    "article title matches",
    article.title,
    articleContent.title,
  );
  TestValidator.equals(
    "article content matches",
    article.content,
    articleContent.content,
  );
  TestValidator.equals("article status is pending", article.status, "pending");
  TestValidator.equals("article version starts at 1", article.version, 1);
  TestValidator.predicate("article view count is 0", article.view_count === 0);
  TestValidator.predicate(
    "article has author ID",
    article.member_author === member.member.id,
  );
  TestValidator.predicate(
    "article has categories",
    article.categories.length === 2,
  );

  // Validate article has proper timestamps
  const articleCreatedAt = new Date(article.created_at);
  const currentTime = new Date();

  TestValidator.predicate(
    "article has recent creation time",
    currentTime.getTime() - articleCreatedAt.getTime() < 10000,
  );
  TestValidator.equals(
    "created_at equals updated_at",
    article.created_at,
    article.updated_at,
  );
  TestValidator.predicate(
    "article has valid UUID format",
    typia.is<string & tags.Format<"uuid">>(article.id),
  );
}
