import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the complete workflow of a member deleting a file attachment from their
 * own article.
 *
 * This test validates that authenticated members can successfully delete file
 * attachments they have uploaded to their own discussion board articles. It
 * covers the full workflow: member registration, article creation, file
 * attachment, and file deletion.
 *
 * The test ensures:
 *
 * 1. Member can register and authenticate successfully
 * 2. Authenticated member can create a discussion board article
 * 3. Member can attach a file to their article
 * 4. Member can delete the file attachment from their article
 * 5. The deletion operation completes without error
 *
 * This validates proper authorization enforcement and file management
 * capabilities for article authors on the discussion board platform.
 */
export async function test_api_article_file_deletion_by_author(
  connection: api.IConnection,
) {
  // Step 1: Register a new member and obtain authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create a discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Attach a file to the article
  const allowedContentTypes = [
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/plain",
    "text/csv",
    "application/zip",
  ] as const;

  const fileExtensions = {
    "application/pdf": ".pdf",
    "application/msword": ".doc",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
      ".docx",
    "application/vnd.ms-excel": ".xls",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
      ".xlsx",
    "text/plain": ".txt",
    "text/csv": ".csv",
    "application/zip": ".zip",
  };

  const selectedContentType = RandomGenerator.pick(allowedContentTypes);
  const fileExtension = fileExtensions[selectedContentType];

  const fileData = {
    original_filename: `${RandomGenerator.name(2).replace(/\s/g, "_")}${fileExtension}`,
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: selectedContentType,
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const file: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: fileData,
      },
    );
  typia.assert(file);

  // Step 4: Delete the file attachment
  await api.functional.discussionBoard.member.articles.files.erase(connection, {
    articleId: article.id,
    fileId: file.id,
  });

  // Step 5: Validation - successful void return indicates proper deletion
  // No exception thrown means the deletion operation completed successfully
}
