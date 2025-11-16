import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test file attachment creation with various file sizes to validate size limit
 * enforcement and metadata accuracy.
 *
 * This test validates the system's ability to handle file attachments of
 * varying sizes for discussion board articles.
 *
 * Test workflow:
 *
 * 1. Register a new member account to obtain authentication credentials
 * 2. Create a discussion board article to serve as the parent entity for file
 *    attachments
 * 3. Attach a small file (1 KB) and verify successful creation with accurate
 *    metadata
 * 4. Attach a medium-sized file (5 MB) and verify successful creation with
 *    accurate metadata
 * 5. Attach a large file approaching the 25 MB limit (24 MB) and verify successful
 *    creation with accurate metadata
 * 6. Validate that file_size metadata accurately reflects the actual file sizes
 *    for all attachments
 * 7. Confirm all files are created successfully when within the documented size
 *    limits
 */
export async function test_api_article_file_attachment_size_limits(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "testPassword123!";
  const memberUsername = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: "https://example.com/register",
      referrer: "https://example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create a discussion board article
  const article = await api.functional.discussionBoard.member.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        body: RandomGenerator.content({
          paragraphs: 3,
          sentenceMin: 10,
          sentenceMax: 20,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Attach a small file (1 KB = 1024 bytes)
  const smallFileSize = 1024;
  const smallFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "small_document.txt",
          file_size: smallFileSize,
          content_type: "text/plain",
          storage_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(smallFile);

  TestValidator.equals(
    "small file size matches expected",
    smallFile.file_size,
    smallFileSize,
  );

  // Step 4: Attach a medium-sized file (5 MB = 5 * 1024 * 1024 bytes)
  const mediumFileSize = 5 * 1024 * 1024;
  const mediumFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "medium_report.pdf",
          file_size: mediumFileSize,
          content_type: "application/pdf",
          storage_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(mediumFile);

  TestValidator.equals(
    "medium file size matches expected",
    mediumFile.file_size,
    mediumFileSize,
  );

  // Step 5: Attach a large file approaching the 25 MB limit (24 MB = 24 * 1024 * 1024 bytes)
  const largeFileSize = 24 * 1024 * 1024;
  const largeFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: article.id,
        body: {
          original_filename: "large_presentation.pptx",
          file_size: largeFileSize,
          content_type:
            "application/vnd.openxmlformats-officedocument.presentationml.presentation",
          storage_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IDiscussionBoardArticleFile.ICreate,
      },
    );
  typia.assert(largeFile);

  TestValidator.equals(
    "large file size matches expected",
    largeFile.file_size,
    largeFileSize,
  );

  // Step 6: Validate all files have accurate metadata
  TestValidator.predicate(
    "small file has positive file size",
    smallFile.file_size > 0,
  );

  TestValidator.predicate(
    "medium file size is within expected range",
    mediumFile.file_size >= 5 * 1024 * 1024 &&
      mediumFile.file_size < 25 * 1024 * 1024,
  );

  TestValidator.predicate(
    "large file size is within valid range",
    largeFile.file_size >= 20 * 1024 * 1024 &&
      largeFile.file_size <= 25 * 1024 * 1024,
  );

  // Step 7: Verify all files belong to the correct article
  TestValidator.equals(
    "small file belongs to article",
    smallFile.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "medium file belongs to article",
    mediumFile.discussion_board_article_id,
    article.id,
  );

  TestValidator.equals(
    "large file belongs to article",
    largeFile.discussion_board_article_id,
    article.id,
  );
}
