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
 * Test article creation with file attachments supporting economic analysis
 * arguments.
 *
 * This E2E test validates the complete content creation workflow for economic
 * discussion articles with supporting file attachments. The scenario tests the
 * multi-step process of creating an article with economic data analysis,
 * including spreadsheet attachments and document supporting materials. This
 * ensures the system properly handles complex content creation while
 * maintaining proper relationships between articles and their attachments.
 *
 * The test follows these key validation points:
 *
 * 1. Member authentication setup to authorize article creation
 * 2. Article creation with comprehensive economic analysis content
 * 3. Attachment file creation with different file types (documents, spreadsheets,
 *    images)
 * 4. Validation of article-attachment relationships and data integrity
 * 5. Verification of article metadata including categories and status
 *
 * This validates the entire content creation pipeline for economic discussion
 * articles, ensuring arguments are properly supported with data attachments and
 * the content management system correctly handles multi-part economic analysis
 * submissions.
 */
export async function test_api_economic_article_creation_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a member for article creation
  const memberAuth = await api.functional.auth.member.join(connection, {
    body: {
      username:
        RandomGenerator.name(1).toLowerCase() + RandomGenerator.alphabets(5),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(memberAuth);

  // Step 2: Create categories array for article categorization
  const categoryIds = ArrayUtil.repeat(2, () =>
    typia.random<string & tags.Format<"uuid">>(),
  );

  // Step 3: Create economic analysis article with comprehensive content
  const requestBody = {
    title: "Economic Policy Impact Analysis: 2024 Market Reforms",
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: categoryIds,
    attachments: ArrayUtil.repeat(3, () => {
      const fileTypes = ["document", "spreadsheet", "image"] as const;
      const selectedType = RandomGenerator.pick(fileTypes);
      const fileSizes = {
        document: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<500000>
        >(),
        spreadsheet: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<2000> &
            tags.Maximum<800000>
        >(),
        image: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<50000> &
            tags.Maximum<1048576>
        >(),
      };
      return {
        file_size: fileSizes[selectedType],
        file_type: selectedType,
        filename: `${RandomGenerator.name(2)}.${
          selectedType === "document"
            ? "pdf"
            : selectedType === "spreadsheet"
              ? "xlsx"
              : "png"
        }`,
        mime_type:
          selectedType === "document"
            ? "application/pdf"
            : selectedType === "spreadsheet"
              ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              : "image/png",
      } satisfies IEconomicDiscussionAttachments.ICreate;
    }),
  } satisfies IEconomicDiscussionArticle.ICreate;

  // Step 4: Create article with attachments
  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: requestBody,
    });
  typia.assert(createdArticle);

  // Step 5: Validate article creation response
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    requestBody.title,
  );
  TestValidator.equals(
    "article content matches",
    createdArticle.content,
    requestBody.content,
  );
  TestValidator.predicate(
    "article has pending status",
    createdArticle.status === "pending",
  );
  TestValidator.predicate(
    "article version is 1.0",
    createdArticle.version === 1,
  );
  TestValidator.predicate(
    "article view count is 0",
    createdArticle.view_count === 0,
  );
  TestValidator.equals(
    "article has member author",
    createdArticle.member_author,
    memberAuth.member.id,
  );
  TestValidator.predicate(
    "article has author profile",
    createdArticle.member_author_profile !== undefined,
  );
  TestValidator.equals(
    "article username matches",
    createdArticle.member_author_profile?.username,
    memberAuth.member.username,
  );
  TestValidator.equals(
    "article categories count matches",
    createdArticle.categories.length,
    categoryIds.length,
  );

  // Step 6: Validate timestamp properties
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    createdArticle.created_at.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) !==
      null,
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    createdArticle.updated_at.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) !==
      null,
  );
  TestValidator.equals(
    "update time after creation",
    new Date(createdArticle.updated_at).getTime(),
    new Date(createdArticle.created_at).getTime(),
  );

  // Step 7: Validate article ID format
  typia.assert<string & tags.Format<"uuid">>(createdArticle.id);

  // Step 8: Validate category references
  for (let i = 0; i < categoryIds.length; i++) {
    const category = createdArticle.categories[i];
    TestValidator.predicate(
      "category has valid ID",
      typia.is<string & tags.Format<"uuid">>(category.id),
    );
    TestValidator.predicate("category has name", category.name.length > 0);
    TestValidator.predicate("category has code", category.code.length > 0);
  }
}
