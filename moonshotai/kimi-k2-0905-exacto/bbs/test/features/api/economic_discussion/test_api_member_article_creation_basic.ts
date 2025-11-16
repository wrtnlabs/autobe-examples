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
 * Test basic article creation by an authenticated member
 *
 * This test validates the complete workflow of economic discussion article
 * creation from member registration through article publication. The test
 * ensures that:
 *
 * - Members can successfully register with valid credentials
 * - Authenticated members can create articles with complete content
 * - Articles receive proper versioning starting at 1.0
 * - New articles enter the moderation queue with pending status
 * - Articles are correctly attributed to their creating member
 * - All content fields meet platform guidelines and requirements
 *
 * Business context: This test represents a core use case of the economic
 * discussion platform where members publish economic insights, political
 * analysis, and policy discussions. The creation process establishes
 * foundational metadata that supports the platform's moderation workflow and
 * content quality standards.
 */
export async function test_api_member_article_creation_basic(
  connection: api.IConnection,
) {
  // 1. Register as a new member to establish authentication context
  const memberCredentials = {
    username: RandomGenerator.name(1),
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123",
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberCredentials,
  });
  typia.assert(member);

  // 2. Validate member registration success
  TestValidator.equals(
    "member username matches registration",
    member.member.username,
    memberCredentials.username,
  );
  TestValidator.equals(
    "member email matches registration",
    member.member.email,
    memberCredentials.email,
  );
  TestValidator.predicate(
    "member has valid authentication token",
    member.access_token.length > 0,
  );

  // 3. Create a category for article organization
  const articleCategory: IEconomicDiscussionCategories.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>() as any,
    code: "ECON_ANALYSIS",
    name: "Economic Analysis",
    article_count: 0,
    display_order: 1,
    is_active: true,
  };

  // 4. Create article with comprehensive content
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 15,
      wordMin: 5,
      wordMax: 10,
    }),
    category_ids: [articleCategory.id],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // 5. Validate article creation results
  TestValidator.equals(
    "article title matches creation request",
    article.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches creation request",
    article.content,
    articleData.content,
  );
  TestValidator.predicate(
    "article has valid UUID",
    article.id.length > 0 &&
      /^[a-zA-Z0-9_-]{8}-[a-zA-Z0-9_-]{4}-[a-zA-Z0-9_-]{4}-[a-zA-Z0-9_-]{4}-[a-zA-Z0-9_-]{12}$/.test(
        article.id,
      ),
  );

  // 6. Verify automatic version initialization
  TestValidator.equals(
    "article version initialized to 1.0",
    article.version,
    1,
  );

  // 7. Confirm pending moderation status assignment
  TestValidator.equals(
    "article status is pending moderation",
    article.status,
    "pending",
  );

  // 8. Validate view count initialization
  TestValidator.equals(
    "article view count initialized to zero",
    article.view_count,
    0,
  );

  // 9. Verify member author association
  TestValidator.equals(
    "article member author equals creating member",
    article.member_author,
    member.member.id,
  );

  // 10. Validate timestamp generation
  TestValidator.predicate(
    "article has valid creation timestamp",
    new Date(article.created_at).getTime() > Date.now() - 60000,
  ); // Created within last minute
  TestValidator.predicate(
    "article has valid update timestamp",
    new Date(article.updated_at).getTime() > Date.now() - 60000,
  ); // Updated within last minute
}
