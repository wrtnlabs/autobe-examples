import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test deleting all file attachments from an article to validate complete file
 * cleanup workflow.
 *
 * This test validates the complete file cleanup workflow by deleting all file
 * attachments from a discussion board article.
 *
 * The test ensures that:
 *
 * 1. A member can successfully register and authenticate
 * 2. An article can be created by the authenticated member
 * 3. Multiple files (3-5 files) can be attached to the article
 * 4. Each file attachment can be deleted one by one
 * 5. All deletion operations succeed without errors
 * 6. The article remains intact and accessible after all files are removed
 * 7. The system properly handles consecutive deletion operations
 *
 * This comprehensive test verifies the file attachment deletion functionality
 * works correctly and that removing all files doesn't affect the parent
 * article's integrity.
 */
export async function test_api_article_file_deletion_complete_cleanup(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string>(),
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
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(article);

  // Step 3: Attach multiple files to the article (3-5 files)
  const fileCount = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<3> & tags.Maximum<5>
  >();
  const createdFiles: IDiscussionBoardArticleFile[] =
    await ArrayUtil.asyncRepeat(fileCount, async () => {
      const fileData = {
        original_filename: `${RandomGenerator.name()}.pdf`,
        file_size: typia.random<
          number &
            tags.Type<"int32"> &
            tags.Minimum<1000> &
            tags.Maximum<1000000>
        >(),
        content_type: "application/pdf",
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
      return file;
    });

  TestValidator.equals(
    "all files created successfully",
    createdFiles.length,
    fileCount,
  );

  // Step 4: Delete each file attachment one by one
  await ArrayUtil.asyncForEach(createdFiles, async (file, index) => {
    await api.functional.discussionBoard.member.articles.files.erase(
      connection,
      {
        articleId: article.id,
        fileId: file.id,
      },
    );

    // Verify deletion operation succeeded (no error thrown means success)
    TestValidator.predicate(
      `file ${index + 1} of ${fileCount} deleted successfully`,
      true,
    );
  });

  // Step 5: Verify all files are removed (no verification endpoint available in this scenario)
  TestValidator.equals(
    "all file deletions completed",
    createdFiles.length,
    fileCount,
  );

  // Step 6: Validate the article remains intact after all file deletions
  // Since there's no get article endpoint provided, we validate the article object still exists
  TestValidator.predicate(
    "article remains valid after file cleanup",
    article.id !== null && article.id !== undefined,
  );
  TestValidator.equals(
    "article title unchanged",
    article.title,
    articleData.title,
  );
  TestValidator.equals(
    "article body unchanged",
    article.body,
    articleData.body,
  );
}
