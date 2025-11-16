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

export async function test_api_article_creation_member_basic(
  connection: api.IConnection,
) {
  // Step 1: Create new member account for testing
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: IEconomicDiscussionMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.name(),
        email: memberEmail,
        password: "SecurePassword123",
      } satisfies IEconomicDiscussionMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Verify member authentication was successful
  TestValidator.predicate(
    "member authentication successful",
    member.access_token.length > 0,
  );
  TestValidator.predicate(
    "member has valid refresh token",
    member.refresh_token.length > 0,
  );
  TestValidator.equals(
    "member email matches registration",
    member.member.email,
    memberEmail,
  );

  // Step 3: Create article category ID for assignment
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  // Step 4: Create comprehensive article with valid content
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 5,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });

  const articleTitle = RandomGenerator.paragraph({
    sentences: 2,
    wordMin: 4,
    wordMax: 10,
  });

  // Step 5: Create new article with comprehensive data
  const createdArticle: IEconomicDiscussionArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: articleTitle,
        content: articleContent,
        category_ids: [categoryId],
        attachments: [
          {
            filename: "analysis_document.pdf",
            file_size: 1024 * 512, // 512KB
            file_type: "document",
            mime_type: "application/pdf",
          },
        ],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(createdArticle);

  // Step 6: Validate article creation response
  TestValidator.equals(
    "article title matches request",
    createdArticle.title,
    articleTitle,
  );
  TestValidator.equals(
    "article content matches request",
    createdArticle.content,
    articleContent,
  );
  TestValidator.predicate(
    "article has valid UUID format",
    createdArticle.id.length === 36,
  );
  TestValidator.equals(
    "article view count initialized to 0",
    createdArticle.view_count,
    0,
  );
  TestValidator.equals(
    "article version initialized to 1",
    createdArticle.version,
    1,
  );
  TestValidator.equals(
    "article status is pending",
    createdArticle.status,
    "pending",
  );
  TestValidator.predicate(
    "article has creation timestamp",
    createdArticle.created_at.length > 0,
  );
  TestValidator.predicate(
    "article has update timestamp",
    createdArticle.updated_at.length > 0,
  );
  TestValidator.equals(
    "article has one category",
    createdArticle.categories.length,
    1,
  );
  TestValidator.equals(
    "article category matches request ID",
    createdArticle.categories[0].id,
    categoryId,
  );
}
