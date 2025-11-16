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

export async function test_api_article_creation_content_validation(
  connection: api.IConnection,
) {
  // Step 1: Register new member account to establish authentication context
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(8),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(12),
    } satisfies IEconomicDiscussionMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create valid article with proper content length
  const validArticleData = {
    title: RandomGenerator.paragraph({
      sentences: 10,
      wordMin: 3,
      wordMax: 10,
    }),
    content: RandomGenerator.content({
      paragraphs: 5,
      sentenceMin: 15,
      sentenceMax: 25,
      wordMin: 4,
      wordMax: 8,
    }),
    category_ids: [typia.random<string & tags.Format<"uuid">>()],
  } satisfies IEconomicDiscussionArticle.ICreate;

  const validArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: validArticleData,
    });
  typia.assert(validArticle);

  // Validate response properties
  TestValidator.equals(
    "valid article title",
    validArticle.title,
    validArticleData.title,
  );
  TestValidator.equals(
    "valid article content",
    validArticle.content,
    validArticleData.content,
  );
  TestValidator.equals("valid article version", validArticle.version, 1);
  TestValidator.equals("valid article status", validArticle.status, "pending");
  TestValidator.equals("valid article view count", validArticle.view_count, 0);
  TestValidator.predicate(
    "valid article creation timestamp",
    validArticle.created_at.length > 0,
  );
  TestValidator.predicate(
    "valid article update timestamp",
    validArticle.updated_at.length > 0,
  );

  // Step 3: Test minimum content length - exactly 10 characters
  const minimumContentArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "A",
        content: "A1B2C3D4E5", // Exactly 10 characters
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(minimumContentArticle);
  TestValidator.equals(
    "minimum content length",
    minimumContentArticle.content.length,
    10,
  );

  // Step 4: Test minimum title length - exactly 1 character
  const minimumTitleArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "X", // Exactly 1 character
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 3,
          wordMax: 7,
        }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(minimumTitleArticle);
  TestValidator.equals(
    "minimum title length",
    minimumTitleArticle.title.length,
    1,
  );

  // Step 5: Test maximum title length - exactly 500 characters
  const maxTitleContent = RandomGenerator.alphabets(500);
  const maximumTitleArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: maxTitleContent, // Exactly 500 characters
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 3,
          wordMax: 7,
        }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(maximumTitleArticle);
  TestValidator.equals(
    "maximum title length",
    maximumTitleArticle.title.length,
    500,
  );

  // Step 6: Test maximum content length - exactly 50,000 characters
  const maxContent = RandomGenerator.alphabets(50000);
  const maximumContentArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Maximum content test",
        content: maxContent, // Exactly 50,000 characters
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(maximumContentArticle);
  TestValidator.equals(
    "maximum content length",
    maximumContentArticle.content.length,
    50000,
  );

  // Step 7: Test attachment filename max length validation
  const maxFilenameLength = RandomGenerator.alphabets(255);
  const maxFilenameArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Max filename test",
        content: "Testing maximum filename length validation.",
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: [
          {
            file_size: 1024,
            file_type: "image",
            filename: maxFilenameLength, // Exactly 255 characters
            mime_type: "application/pdf",
          },
        ],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(maxFilenameArticle);

  // Step 8: Test attachment file size limits
  const maxFileSizeArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Max file size test",
        content: "Testing maximum file size validation.",
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: [
          {
            file_size: 10485760, // Exactly 10MB (10485760 bytes)
            file_type: "image",
            filename: "large-analysis.png",
            mime_type: "image/png",
          },
        ],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(maxFileSizeArticle);

  // Step 9: Test attachment minimum file size (1 byte minimum)
  const minFileSizeArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Min file size test",
        content: "Testing minimum file size validation.",
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: [
          {
            file_size: 1, // Exactly 1 byte (minimum allowed)
            file_type: "document",
            filename: "tiny-file.txt",
            mime_type: "text/plain",
          },
        ],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(minFileSizeArticle);

  // Step 10: Test article with multiple categories
  const multipleCategoriesArticle =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Multi-category topic",
        content: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 12,
          sentenceMax: 18,
          wordMin: 4,
          wordMax: 9,
        }),
        category_ids: ArrayUtil.repeat(3, () =>
          typia.random<string & tags.Format<"uuid">>(),
        ),
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(multipleCategoriesArticle);
  TestValidator.equals(
    "multiple categories count",
    multipleCategoriesArticle.categories.length,
    3,
  );

  // Step 11: Test article with file attachments
  const articleWithAttachments =
    await api.functional.economicDiscussion.member.articles.create(connection, {
      body: {
        title: "Article with attachments",
        content: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
          wordMin: 4,
          wordMax: 8,
        }),
        category_ids: [typia.random<string & tags.Format<"uuid">>()],
        attachments: [
          {
            file_size: 1024 * 1024, // 1MB
            file_type: "image",
            filename: "economic-chart.png",
            mime_type: "image/png",
          },
          {
            file_size: 512 * 1024, // 500KB
            file_type: "document",
            filename: "policy-analysis.pdf",
            mime_type: "application/pdf",
          },
        ],
      } satisfies IEconomicDiscussionArticle.ICreate,
    });
  typia.assert(articleWithAttachments);
}
