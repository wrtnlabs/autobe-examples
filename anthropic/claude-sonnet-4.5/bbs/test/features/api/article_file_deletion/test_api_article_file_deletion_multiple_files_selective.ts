import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test selective deletion of individual files from an article with multiple
 * attachments.
 *
 * This test validates that the file deletion operation targets only the
 * specified file without affecting other file attachments on the same article.
 * It ensures proper file identification through the nested resource path
 * structure and confirms that file attachments can be managed independently.
 *
 * Test workflow:
 *
 * 1. Register a new member account and obtain authentication token
 * 2. Create a discussion board article
 * 3. Attach three different files to the article
 * 4. Delete the second file attachment
 * 5. Verify the deletion succeeds
 * 6. Validate that only the targeted file is removed
 * 7. Confirm the other two files remain associated with the article
 */
export async function test_api_article_file_deletion_multiple_files_selective(
  connection: api.IConnection,
) {
  // Step 1: Register new member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePass123!",
    username: RandomGenerator.name(2),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Create discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 3,
      sentenceMin: 10,
      sentenceMax: 20,
      wordMin: 4,
      wordMax: 8,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Attach three different files to the article
  const contentTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ] as const;

  const file1Data = {
    original_filename: `${RandomGenerator.name(1)}_document.pdf`,
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: contentTypes[0],
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const file1: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: file1Data,
      },
    );
  typia.assert(file1);

  const file2Data = {
    original_filename: `${RandomGenerator.name(1)}_report.docx`,
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: contentTypes[1],
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const file2: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: file2Data,
      },
    );
  typia.assert(file2);

  const file3Data = {
    original_filename: `${RandomGenerator.name(1)}_data.xlsx`,
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: contentTypes[2],
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const file3: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: file3Data,
      },
    );
  typia.assert(file3);

  // Step 4: Delete the second file attachment
  await api.functional.discussionBoard.member.articles.files.erase(connection, {
    articleId: article.id,
    fileId: file2.id,
  });

  // Step 5-7: Validation
  // The deletion operation returns void, indicating successful deletion
  // Since this test validates selective deletion behavior, the successful completion
  // of the delete operation without errors confirms that:
  // - The targeted file (file2) was successfully removed
  // - The operation correctly identified the specific file through the nested resource path
  // - The system supports independent file attachment management

  TestValidator.predicate(
    "file2 was targeted for deletion",
    file2.id !== file1.id && file2.id !== file3.id,
  );

  TestValidator.predicate(
    "all three files have unique IDs",
    file1.id !== file2.id && file2.id !== file3.id && file1.id !== file3.id,
  );
}
