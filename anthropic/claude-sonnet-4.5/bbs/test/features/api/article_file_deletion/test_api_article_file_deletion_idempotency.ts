import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test the idempotency and error handling of file deletion operations.
 *
 * This test validates that attempting to delete the same file multiple times
 * results in appropriate error handling rather than system failures. The first
 * deletion should succeed, while subsequent attempts should return 404 Not
 * Found.
 *
 * Test workflow:
 *
 * 1. Register a new member account and authenticate
 * 2. Create a discussion board article
 * 3. Attach a file to the article
 * 4. Delete the file attachment successfully (first deletion)
 * 5. Attempt to delete the same file again (second deletion)
 * 6. Validate that the second deletion returns 404 Not Found error
 * 7. Confirm the system handles repeated deletion requests gracefully
 */
export async function test_api_article_file_deletion_idempotency(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account and authenticate
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(),
    ip: "127.0.0.1",
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
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
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
  const fileData = {
    original_filename: `test_document_${RandomGenerator.alphaNumeric(8)}.pdf`,
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "application/pdf",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const attachedFile: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: fileData,
      },
    );
  typia.assert(attachedFile);

  // Step 4: Delete the file attachment successfully (first deletion)
  await api.functional.discussionBoard.member.articles.files.erase(connection, {
    articleId: article.id,
    fileId: attachedFile.id,
  });

  // Step 5 & 6: Attempt to delete the same file again and validate 404 error
  await TestValidator.error(
    "second deletion attempt should return 404 Not Found",
    async () => {
      await api.functional.discussionBoard.member.articles.files.erase(
        connection,
        {
          articleId: article.id,
          fileId: attachedFile.id,
        },
      );
    },
  );
}
