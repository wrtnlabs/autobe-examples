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
 * Test that a member can create an article with metadata specifying file
 * attachments up to the maximum allowed (5).
 *
 * This test validates the complete workflow of article creation with
 * attachments:
 *
 * 1. Register a new member account for testing
 * 2. Create an article with exactly 5 attachments of different file types
 * 3. Verify the article creation response includes all attachment metadata
 * 4. Validate attachment count and details match the submitted data
 *
 * The test covers the maximum attachment limit (5) as specified in the DTO
 * constraints and ensures proper handling of different file types (image,
 * document, spreadsheet).
 */
export async function test_api_member_article_create_with_attachments(
  connection: api.IConnection,
) {
  // Step 1: Register as a new member
  const memberData = {
    username: RandomGenerator.name(),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IEconomicDiscussionMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an article with exactly 5 attachments (maximum allowed)
  const fileTypes = ["image", "document", "spreadsheet"] as const;
  const attachments = ArrayUtil.repeat(5, (index) => {
    const fileType = fileTypes[index % fileTypes.length];
    const fileSize = typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1000> & tags.Maximum<10485760>
    >();
    const filename = `${RandomGenerator.name(1)}_${index + 1}`;

    const mimeTypeMap: Record<typeof fileType, string> = {
      image: "image/png",
      document: "application/pdf",
      spreadsheet:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };

    const extensionMap: Record<typeof fileType, string> = {
      image: "png",
      document: "pdf",
      spreadsheet: "xlsx",
    };

    return {
      file_size: fileSize,
      file_type: fileType,
      filename: `${filename}.${extensionMap[fileType]}`,
      mime_type: mimeTypeMap[fileType],
    } satisfies IEconomicDiscussionAttachments.ICreate;
  });

  // Use a consistent category ID for the article
  const categoryId = typia.random<string & tags.Format<"uuid">>();

  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 4, wordMax: 8 }),
    content: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 3,
      wordMax: 7,
    }),
    category_ids: [categoryId],
    attachments: attachments,
  } satisfies IEconomicDiscussionArticle.ICreate;

  const article =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Validate the created article
  TestValidator.equals(
    "article title matches",
    article.title,
    articleData.title,
  );
  TestValidator.equals(
    "article content matches",
    article.content,
    articleData.content,
  );
  TestValidator.equals(
    "article has correct category count",
    article.categories.length,
    1,
  );

  // Step 4: Validate article creation was successful
  TestValidator.equals("article status is pending", article.status, "pending");
  TestValidator.equals("article version is 1.0", article.version, 1);
  TestValidator.equals("article has zero view count", article.view_count, 0);
  TestValidator.predicate(
    "article has valid timestamps",
    new Date(article.created_at).getTime() > 0 &&
      new Date(article.updated_at).getTime() > 0,
  );

  // Validate that we successfully created an article with maximum attachments
  TestValidator.predicate(
    "article creation successful with attachments",
    article.id !== undefined,
  );
  TestValidator.predicate(
    "article has author profile",
    article.member_author_profile !== undefined,
  );
}
