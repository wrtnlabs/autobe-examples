import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleFile";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";

/**
 * Test attaching multiple file attachments to a single article.
 *
 * This test validates that the discussion board system supports multiple file
 * attachments per article, properly manages file metadata for each attachment,
 * and maintains correct relationships between articles and their files.
 *
 * Test workflow:
 *
 * 1. Register a new member account and authenticate
 * 2. Create a discussion board article
 * 3. Attach three different files with varying metadata
 * 4. Verify all files are created successfully
 * 5. Validate file uniqueness and metadata correctness
 * 6. Confirm proper article association for all files
 */
export async function test_api_article_file_attachment_multiple_files(
  connection: api.IConnection,
) {
  // Step 1: Register a new member account and authenticate
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "securePassword123";
  const memberUsername = RandomGenerator.name();

  const registrationBody = {
    email: memberEmail,
    password: memberPassword,
    username: memberUsername,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const authorizedMember: IDiscussionBoardMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedMember);

  // Step 2: Create a discussion board article
  const articleTitle = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const articleBody = RandomGenerator.content({
    paragraphs: 3,
    sentenceMin: 10,
    sentenceMax: 20,
    wordMin: 5,
    wordMax: 10,
  });

  const articleData = {
    title: articleTitle,
    body: articleBody,
  } satisfies IDiscussionBoardArticle.ICreate;

  const createdArticle: IDiscussionBoardArticle =
    await api.functional.discussionBoard.member.articles.create(connection, {
      body: articleData,
    });
  typia.assert(createdArticle);

  // Step 3: Attach the first file (PDF research report)
  const file1Data = {
    original_filename: "research_report.pdf",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "application/pdf",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const file1: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: createdArticle.id,
        body: file1Data,
      },
    );
  typia.assert(file1);

  // Step 4: Attach the second file (Excel spreadsheet)
  const file2Data = {
    original_filename: "economic_data.xlsx",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const file2: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: createdArticle.id,
        body: file2Data,
      },
    );
  typia.assert(file2);

  // Step 5: Attach the third file (text document)
  const file3Data = {
    original_filename: "additional_notes.txt",
    file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    content_type: "text/plain",
    storage_url: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardArticleFile.ICreate;

  const file3: IDiscussionBoardArticleFile =
    await api.functional.discussionBoard.member.articles.files.create(
      connection,
      {
        articleId: createdArticle.id,
        body: file3Data,
      },
    );
  typia.assert(file3);

  // Step 6 & 7: Validate each file has unique identifiers and correct metadata
  TestValidator.predicate(
    "file1 has unique UUID identifier",
    file1.id !== file2.id && file1.id !== file3.id,
  );

  TestValidator.predicate(
    "file2 has unique UUID identifier",
    file2.id !== file1.id && file2.id !== file3.id,
  );

  TestValidator.predicate(
    "file3 has unique UUID identifier",
    file3.id !== file1.id && file3.id !== file2.id,
  );

  TestValidator.equals(
    "file1 original filename matches",
    file1.original_filename,
    file1Data.original_filename,
  );

  TestValidator.equals(
    "file1 content type matches",
    file1.content_type,
    file1Data.content_type,
  );

  TestValidator.equals(
    "file2 original filename matches",
    file2.original_filename,
    file2Data.original_filename,
  );

  TestValidator.equals(
    "file2 content type matches",
    file2.content_type,
    file2Data.content_type,
  );

  TestValidator.equals(
    "file3 original filename matches",
    file3.original_filename,
    file3Data.original_filename,
  );

  TestValidator.equals(
    "file3 content type matches",
    file3.content_type,
    file3Data.content_type,
  );

  // Step 8: Confirm all files are properly associated with the same parent article
  TestValidator.equals(
    "file1 is associated with the created article",
    file1.discussion_board_article_id,
    createdArticle.id,
  );

  TestValidator.equals(
    "file2 is associated with the created article",
    file2.discussion_board_article_id,
    createdArticle.id,
  );

  TestValidator.equals(
    "file3 is associated with the created article",
    file3.discussion_board_article_id,
    createdArticle.id,
  );
}
