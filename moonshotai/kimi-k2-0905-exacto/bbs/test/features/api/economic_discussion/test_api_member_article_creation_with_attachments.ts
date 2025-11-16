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
 * Test comprehensive article creation with multi-format file attachments.
 *
 * This test validates the complete workflow for creating economic discussion
 * articles with various file attachments. The process includes:
 *
 * 1. Member registration to establish authentication context
 * 2. Article creation with rich economic content and policy discussion
 * 3. Multi-format file attachment upload through DTO data
 * 4. Article metadata validation and verification
 * 5. Attachment relationship testing via creation data
 *
 * The test ensures members can enhance their economic analysis with
 * supplementary materials while maintaining proper file metadata and article
 * structure integrity.
 */
export async function test_api_member_article_creation_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member with proper authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.name(),
      email: memberEmail,
      password: "SecurePassword123!",
      email_verified: false,
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create categories for article organization
  const categories = [typia.random<string & tags.Format<"uuid">>()];

  // Step 3: Create comprehensive article with economic analysis and attachments
  const articleCreationData = {
    title: "Economic Impact of Fiscal Policy on Market Stability",
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 8,
      sentenceMax: 15,
      wordMin: 4,
      wordMax: 10,
    }),
    category_ids: categories,
    attachments: [
      {
        filename: "fiscal_policy_analysis.xlsx",
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1024> &
            tags.Maximum<5242880>
        >(),
        file_type: "spreadsheet" as IEconomicDiscussionAttachmentFileType,
        mime_type:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      },
      {
        filename: "market_data_chart.png",
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<512> &
            tags.Maximum<2097152>
        >(),
        file_type: "image" as IEconomicDiscussionAttachmentFileType,
        mime_type: "image/png",
      },
      {
        filename: "economic_research_report.pdf",
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<2048> &
            tags.Maximum<8388608>
        >(),
        file_type: "document" as IEconomicDiscussionAttachmentFileType,
        mime_type: "application/pdf",
      },
    ] satisfies IEconomicDiscussionAttachments.ICreate[],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const createdArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleCreationData,
    });
  typia.assert(createdArticle);

  // Step 4: Validate article creation success
  TestValidator.equals(
    "article title matches",
    createdArticle.title,
    articleCreationData.title,
  );
  TestValidator.equals(
    "article content matches",
    createdArticle.content,
    articleCreationData.content,
  );
  TestValidator.equals(
    "author member ID matches",
    createdArticle.member_author,
    member.member.id,
  );
  TestValidator.equals(
    "category count matches",
    createdArticle.categories.length,
    1,
  );

  // Step 5: Verify article version and metadata
  TestValidator.equals("article version is 1", createdArticle.version, 1);
  TestValidator.equals(
    "article status is pending",
    createdArticle.status,
    "pending",
  );
  TestValidator.equals(
    "view count starts at zero",
    createdArticle.view_count,
    0,
  );
  TestValidator.predicate(
    "timestamps present",
    createdArticle.created_at !== null && createdArticle.updated_at !== null,
  );
  TestValidator.predicate(
    "deleted_at is null",
    createdArticle.deleted_at === null,
  );

  // Step 6: Test attachment count limits - assume validation occurs
  await TestValidator.error(
    "should fail when exceeding attachment limit",
    async () => {
      const excessiveAttachments = ArrayUtil.repeat(
        6,
        (index) =>
          ({
            filename: `extra_file_${index}.txt`,
            file_size: typia.random<
              number &
                tags.Type<"int32"> &
                tags.Minimum<100> &
                tags.Maximum<100000>
            >(),
            file_type: "document" as IEconomicDiscussionAttachmentFileType,
            mime_type: "text/plain",
          }) satisfies IEconomicDiscussionAttachments.ICreate,
      );

      await await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: {
            title: "Too Many Attachments",
            content: RandomGenerator.content({ paragraphs: 2 }),
            category_ids: categories,
            attachments: excessiveAttachments,
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    },
  );

  // Step 7: Test file size validation
  await TestValidator.error(
    "should fail when file size exceeds limit",
    async () => {
      await await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: {
            title: "Large File Test",
            content: RandomGenerator.content({ paragraphs: 1 }),
            category_ids: categories,
            attachments: [
              {
                filename: "huge_file.zip",
                file_size: typia.random<
                  number & tags.Type<"int32"> & tags.Minimum<11000000>
                >(),
                file_type: "document" as IEconomicDiscussionAttachmentFileType,
                mime_type: "application/zip",
              },
            ],
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    },
  );

  // Step 8: Test invalid file type
  await TestValidator.error(
    "should fail when file type not supported",
    async () => {
      await await api.functional.economicDiscussion.member.articles.create(
        connection,
        {
          body: {
            title: "Invalid File Type Test",
            content: RandomGenerator.content({ paragraphs: 1 }),
            category_ids: categories,
            attachments: [
              {
                filename: "unsupported.xyz",
                file_size: typia.random<
                  number &
                    tags.Type<"int32"> &
                    tags.Minimum<1000> &
                    tags.Maximum<100000>
                >(),
                file_type: "video" as IEconomicDiscussionAttachmentFileType,
                mime_type: "video/mp4",
              },
            ],
          } satisfies IEconomicDiscussionArticle.ICreate,
        },
      );
    },
  );
}
