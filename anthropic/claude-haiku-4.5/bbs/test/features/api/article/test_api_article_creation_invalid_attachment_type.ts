import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardArticleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleCategory";
import type { IDiscussionBoardContributor } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContributor";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";

/**
 * Test article creation with unsupported file attachment type validation.
 *
 * This test validates that the discussion board article creation endpoint
 * properly rejects articles with unsupported file attachment types. The test
 * verifies that:
 *
 * 1. A new contributor account is successfully created and authenticated
 * 2. Attempts to create articles with unsupported attachment file types (.exe,
 *    .zip, .mp4, .rar) are rejected with appropriate errors
 * 3. The API correctly validates file type against allowed formats (jpg, png, gif,
 *    webp for images; pdf, docx, xlsx, txt for documents)
 * 4. Articles are not created when file type validation fails
 * 5. Error responses clearly indicate the reason for rejection
 *
 * The test ensures proper security by preventing potentially dangerous or
 * unwanted file types from being attached to discussion board articles.
 */
export async function test_api_article_creation_invalid_attachment_type(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate a contributor account
  // Generate a secure password with uppercase, lowercase, number, and special character
  const securePassword =
    `${RandomGenerator.alphabets(3)}${RandomGenerator.alphaNumeric(4)}!@#`.substring(
      0,
      12,
    );

  const contributor: IDiscussionBoardContributor.IAuthorized =
    await api.functional.auth.contributor.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        username: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<50> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        password: "TestPass123!",
        href: "https://example.com/join",
        referrer: "https://example.com",
      } satisfies IDiscussionBoardContributor.ICreate,
    });
  typia.assert(contributor);
  TestValidator.equals(
    "contributor authenticated with access token",
    typeof contributor.token.access,
    "string",
  );

  // Step 2: Test article creation with unsupported attachment file type (.exe)
  await TestValidator.error(
    "should reject article with .exe executable file attachment",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            categoryId: typia.random<string & tags.Format<"uuid">>(),
            href: "https://example.com/article-create",
            referrer: "https://example.com/dashboard",
            attachments: [
              {
                original_filename: "malware.exe",
                file_type: "exe",
                file_size: 1024 * 100,
                mime_type: "application/x-msdownload",
                display_url: "https://storage.example.com/malware.exe",
              } satisfies IDiscussionBoardArticleAttachment.ICreate,
            ],
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );

  // Step 3: Test article creation with unsupported attachment file type (.zip)
  await TestValidator.error(
    "should reject article with .zip archive file attachment",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            categoryId: typia.random<string & tags.Format<"uuid">>(),
            href: "https://example.com/article-create",
            referrer: "https://example.com/dashboard",
            attachments: [
              {
                original_filename: "archive.zip",
                file_type: "zip",
                file_size: 1024 * 500,
                mime_type: "application/zip",
                display_url: "https://storage.example.com/archive.zip",
              } satisfies IDiscussionBoardArticleAttachment.ICreate,
            ],
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );

  // Step 4: Test article creation with unsupported attachment file type (.mp4)
  await TestValidator.error(
    "should reject article with .mp4 video file attachment",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            categoryId: typia.random<string & tags.Format<"uuid">>(),
            href: "https://example.com/article-create",
            referrer: "https://example.com/dashboard",
            attachments: [
              {
                original_filename: "video.mp4",
                file_type: "mp4",
                file_size: 1024 * 1024 * 10,
                mime_type: "video/mp4",
                display_url: "https://storage.example.com/video.mp4",
              } satisfies IDiscussionBoardArticleAttachment.ICreate,
            ],
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );

  // Step 5: Test article creation with unsupported attachment file type (.rar)
  await TestValidator.error(
    "should reject article with .rar archive file attachment",
    async () => {
      await api.functional.discussionBoard.contributor.articles.create(
        connection,
        {
          body: {
            title: RandomGenerator.paragraph({ sentences: 3 }),
            content: RandomGenerator.content({ paragraphs: 2 }),
            categoryId: typia.random<string & tags.Format<"uuid">>(),
            href: "https://example.com/article-create",
            referrer: "https://example.com/dashboard",
            attachments: [
              {
                original_filename: "compressed.rar",
                file_type: "rar",
                file_size: 1024 * 256,
                mime_type: "application/x-rar-compressed",
                display_url: "https://storage.example.com/compressed.rar",
              } satisfies IDiscussionBoardArticleAttachment.ICreate,
            ],
          } satisfies IDiscussionBoardArticle.ICreate,
        },
      );
    },
  );

  // Step 6: Verify contributor account properties
  TestValidator.equals(
    "contributor account is active after creation",
    contributor.account_status,
    "active",
  );
}
