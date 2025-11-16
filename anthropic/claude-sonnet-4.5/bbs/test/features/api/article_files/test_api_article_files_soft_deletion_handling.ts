import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleFile";

/**
 * Test soft deletion filtering for article file attachments.
 *
 * This test validates that the file listing API correctly filters soft-deleted
 * files based on the include_deleted parameter. Since the API response returns
 * summary objects without the deleted_at field, we validate soft deletion
 * behavior through:
 *
 * 1. File count differences: include_deleted=false returns fewer files than
 *    include_deleted=true
 * 2. File ID presence: deleted files are absent when include_deleted=false
 * 3. File ID presence: deleted files are present when include_deleted=true
 *
 * Test Flow:
 *
 * 1. Register and authenticate a new member
 * 2. Create a discussion board article
 * 3. Upload 4 file attachments to the article
 * 4. Soft-delete 2 of the 4 files
 * 5. Query files without include_deleted - verify only 2 active files returned
 * 6. Query files with include_deleted=false - verify only 2 active files returned
 * 7. Query files with include_deleted=true - verify all 4 files returned
 * 8. Validate that deleted file IDs are excluded/included appropriately
 */
export async function test_api_article_files_soft_deletion_handling(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate a new member
  const memberRegistration = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SecurePassword123!",
    username: RandomGenerator.name(1),
    href: "https://example.com/register",
    referrer: "https://example.com/home",
  } satisfies IDiscussionBoardMember.ICreate;

  const authenticatedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberRegistration,
    });
  typia.assert(authenticatedMember);

  // Step 2: Create a discussion board article
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 1, wordMin: 5, wordMax: 10 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 10,
      sentenceMax: 20,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Upload 4 file attachments to the article
  const fileAttachments: IDiscussionBoardArticleFile[] =
    await ArrayUtil.asyncRepeat(4, async (index) => {
      const fileData = {
        original_filename: `test-document-${index + 1}.pdf`,
        file_size: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1>
        >(),
        content_type: "application/pdf",
        storage_url: typia.random<string & tags.Format<"uri">>(),
      } satisfies IDiscussionBoardArticleFile.ICreate;

      const uploadedFile: IDiscussionBoardArticleFile =
        await api.functional.discussionBoard.member.articles.files.create(
          connection,
          {
            articleId: createdArticle.id,
            body: fileData,
          },
        );
      typia.assert(uploadedFile);
      return uploadedFile;
    });

  // Step 4: Soft-delete 2 of the 4 files (delete first 2 files)
  const filesToDelete = fileAttachments.slice(0, 2);
  const activeFiles = fileAttachments.slice(2, 4);

  await ArrayUtil.asyncForEach(filesToDelete, async (file) => {
    await api.functional.discussionBoard.member.articles.files.erase(
      connection,
      {
        articleId: createdArticle.id,
        fileId: file.id,
      },
    );
  });

  // Step 5: Query files without include_deleted parameter (defaults to false)
  const defaultQueryResult: IPageIDiscussionBoardArticleFile.ISummary =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: createdArticle.id,
      body: {} satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(defaultQueryResult);

  TestValidator.equals(
    "default query should return only active files",
    defaultQueryResult.data.length,
    2,
  );

  // Verify all returned files are active files (by ID matching)
  await ArrayUtil.asyncForEach(defaultQueryResult.data, async (fileSummary) => {
    const matchingActiveFile = activeFiles.find((f) => f.id === fileSummary.id);
    TestValidator.predicate(
      "file from default query should be one of the active files",
      matchingActiveFile !== undefined,
    );
  });

  // Verify deleted files are NOT in the results
  await ArrayUtil.asyncForEach(filesToDelete, async (deletedFile) => {
    const foundInResults = defaultQueryResult.data.find(
      (f) => f.id === deletedFile.id,
    );
    TestValidator.predicate(
      "deleted file should not appear in default query results",
      foundInResults === undefined,
    );
  });

  // Step 6: Query files with include_deleted=false explicitly
  const explicitFalseQueryResult: IPageIDiscussionBoardArticleFile.ISummary =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: createdArticle.id,
      body: {
        include_deleted: false,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(explicitFalseQueryResult);

  TestValidator.equals(
    "explicit false query should return only active files",
    explicitFalseQueryResult.data.length,
    2,
  );

  // Step 7: Query files with include_deleted=true
  const includedDeletedQueryResult: IPageIDiscussionBoardArticleFile.ISummary =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: createdArticle.id,
      body: {
        include_deleted: true,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(includedDeletedQueryResult);

  TestValidator.equals(
    "include_deleted=true query should return all files",
    includedDeletedQueryResult.data.length,
    4,
  );

  // Step 8: Validate that deleted files appear in include_deleted=true results
  await ArrayUtil.asyncForEach(filesToDelete, async (deletedFile) => {
    const foundInResults = includedDeletedQueryResult.data.find(
      (f) => f.id === deletedFile.id,
    );
    TestValidator.predicate(
      "deleted file should appear when include_deleted=true",
      foundInResults !== undefined,
    );
  });

  // Validate that active files appear in include_deleted=true results
  await ArrayUtil.asyncForEach(activeFiles, async (activeFile) => {
    const foundInResults = includedDeletedQueryResult.data.find(
      (f) => f.id === activeFile.id,
    );
    TestValidator.predicate(
      "active file should appear when include_deleted=true",
      foundInResults !== undefined,
    );
  });

  // Verify pagination metadata
  TestValidator.equals(
    "default query pagination should show 2 records",
    defaultQueryResult.pagination.records,
    2,
  );

  TestValidator.equals(
    "include_deleted=true pagination should show 4 records",
    includedDeletedQueryResult.pagination.records,
    4,
  );
}
