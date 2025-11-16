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
 * Test creating a comprehensive economic discussion article with multiple
 * categories and optional attachments. This scenario validates the complete
 * article creation workflow including title, content validation, category
 * assignment, and proper initialization of metadata like version and view
 * count.
 */
export async function test_api_article_creation_with_categories(
  connection: api.IConnection,
) {
  // Step 1: Register as member to enable article creation
  const memberRegistration = {
    username: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 3,
      wordMax: 10,
    }),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    email_verified: false,
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberRegistration,
  });
  typia.assert(member);

  // Step 2: Create category IDs for article assignment
  const categoryIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 3: Generate realistic article content for economic discussion
  const articleContent = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 15,
    sentenceMax: 25,
    wordMin: 4,
    wordMax: 8,
  });

  // Step 4: Create optional attachments (limit 5, files within size constraints)
  const attachments = ArrayUtil.repeat(2, (index) => {
    const fileTypes: IEconomicDiscussionAttachmentFileType[] = [
      "image",
      "document",
      "spreadsheet",
    ];
    const fileType = fileTypes[index % fileTypes.length];

    const mimeTypes: Record<IEconomicDiscussionAttachmentFileType, string> = {
      image: "image/png",
      document: "application/pdf",
      spreadsheet: "application/vnd.ms-excel",
    };

    const filenameMap: Record<IEconomicDiscussionAttachmentFileType, string> = {
      image: "economic-chart.png",
      document: "policy-analysis.pdf",
      spreadsheet: "data-table.xls",
    };

    return {
      file_size: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1024> & tags.Maximum<1048576>
      >(),
      file_type: fileType,
      filename: filenameMap[fileType],
      mime_type: mimeTypes[fileType],
    } satisfies IEconomicDiscussionAttachments.ICreate;
  });

  // Step 5: Create comprehensive article with all required fields
  const articleCreateRequest = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 15 }),
    content: articleContent,
    category_ids: categoryIds,
    attachments: attachments,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleCreateRequest,
    });

  // Step 6: Validate response structure and data
  typia.assert(createdArticle);

  // Step 7: Verify basic field integrity with descriptive titles
  TestValidator.equals(
    "article title matches input field",
    createdArticle.title,
    articleCreateRequest.title,
  );
  TestValidator.equals(
    "article content matches request body",
    createdArticle.content,
    articleCreateRequest.content,
  );
  TestValidator.predicate(
    "article ID format is valid UUID",
    createdArticle.id.length === 36 && createdArticle.id.includes("-"),
  );
  TestValidator.equals(
    "article version initialized to 1.0",
    createdArticle.version,
    1,
  );
  TestValidator.equals(
    "article view count starts at zero",
    createdArticle.view_count,
    0,
  );
  TestValidator.equals(
    "article status set to pending for review",
    createdArticle.status as string,
    "pending",
  );
  TestValidator.predicate(
    "article creation timestamp follows ISO format",
    createdArticle.created_at.includes("T") &&
      createdArticle.created_at.includes("Z"),
  );
  TestValidator.predicate(
    "article update timestamp follows ISO format",
    createdArticle.updated_at.includes("T") &&
      createdArticle.updated_at.includes("Z"),
  );
}
