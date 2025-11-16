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

export async function test_api_article_retrieval_by_member(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberAuthorization = await api.functional.auth.member.join(
    connection,
    {
      body: {
        username: RandomGenerator.name(),
        email: memberEmail,
        password: "securePassword123",
      } satisfies IEconomicDiscussionMember.ICreate,
    },
  );
  typia.assert(memberAuthorization);

  TestValidator.predicate(
    "member authorization contains access token",
    memberAuthorization.access_token.length > 0,
  );

  // Step 2: Create article with comprehensive content and metadata
  const articleTitle = RandomGenerator.name(3);
  const articleContent = RandomGenerator.content({
    paragraphs: 4,
    sentenceMin: 8,
    sentenceMax: 15,
  });

  const categories: IEconomicDiscussionCategories.ISummary[] = [
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: "Macroeconomics",
      code: "macro",
      is_active: true,
      display_order: 1,
      article_count: 0,
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      name: "Fiscal Policy",
      code: "fiscal",
      is_active: true,
      display_order: 2,
      article_count: 0,
    },
  ];

  const attachments: IEconomicDiscussionAttachments.ICreate[] = [
    {
      filename: "economic_data.xlsx",
      file_size: 1024000,
      mime_type:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      file_type: "spreadsheet",
    },
    {
      filename: "chart_analysis.png",
      file_size: 512000,
      mime_type: "image/png",
      file_type: "image",
    },
  ];

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_ids: categories.map((cat) => cat.id),
        attachments,
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(createdArticle);

  TestValidator.predicate(
    "created article has pending status",
    createdArticle.status === "pending",
  );

  TestValidator.predicate(
    "created article has version 0",
    createdArticle.version === 0,
  );

  TestValidator.predicate(
    "created article has zero view count",
    createdArticle.view_count === 0,
  );

  // Step 3: Retrieve the article and validate comprehensive details
  const retrievedArticle = await api.functional.economicDiscussion.articles.at(
    connection,
    {
      articleId: createdArticle.id,
    },
  );
  typia.assert(retrievedArticle);

  // Validate article identity and content integrity
  TestValidator.equals(
    "retrieved article ID matches created article",
    retrievedArticle.id,
    createdArticle.id,
  );

  TestValidator.equals(
    "article title preserved correctly",
    retrievedArticle.title,
    articleTitle,
  );

  TestValidator.equals(
    "article content preserved correctly",
    retrievedArticle.content,
    articleContent,
  );

  // Validate view count increment
  TestValidator.predicate(
    "view count incremented on retrieval",
    retrievedArticle.view_count === 1,
  );

  // Validate metadata integrity
  TestValidator.predicate(
    "article has valid creation timestamp",
    retrievedArticle.created_at.length > 0,
  );

  TestValidator.predicate(
    "article has valid update timestamp",
    retrievedArticle.updated_at.length > 0,
  );

  // Validate author attribution
  TestValidator.predicate(
    "member author ID matches creator",
    retrievedArticle.member_author === memberAuthorization.member.id,
  );

  TestValidator.equals(
    "member author profile matches authorization data",
    retrievedArticle.member_author_profile?.id,
    memberAuthorization.member.id,
  );

  TestValidator.equals(
    "member author username matches",
    retrievedArticle.member_author_profile?.username,
    memberAuthorization.member.username,
  );

  // Validate category associations
  TestValidator.predicate(
    "article has correct number of categories",
    retrievedArticle.categories.length === categories.length,
  );

  // Fixed: Properly validate all categories are present
  TestValidator.predicate(
    "all expected categories are present",
    categories.every((expectedCat) =>
      retrievedArticle.categories.some(
        (retrievedCat) => retrievedCat.id === expectedCat.id,
      ),
    ),
  );

  // Validate system-generated fields
  TestValidator.predicate(
    "article has expected version tracking",
    retrievedArticle.version >= 0,
  );

  TestValidator.predicate(
    "article status is valid",
    ["pending", "approved", "rejected"].includes(retrievedArticle.status),
  );

  TestValidator.predicate(
    "article has no deletion timestamp",
    retrievedArticle.deleted_at === null,
  );

  TestValidator.predicate(
    "no moderator author for member-created article",
    retrievedArticle.moderator_author === null,
  );

  TestValidator.equals(
    "retrieved article timestamps match creation",
    retrievedArticle.created_at,
    createdArticle.created_at,
  );

  TestValidator.equals(
    "retrieved article timestamps match update",
    retrievedArticle.updated_at,
    createdArticle.updated_at,
  );
}
