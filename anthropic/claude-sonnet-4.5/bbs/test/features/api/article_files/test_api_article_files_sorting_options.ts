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
 * Test sorting file attachments using multiple sort options.
 *
 * This test validates the file attachment sorting functionality for discussion
 * board articles. It verifies that files can be sorted by different fields
 * (created_at, size, name, extension) in both ascending and descending order.
 *
 * Test workflow:
 *
 * 1. Create a member account for authentication
 * 2. Create an article to attach files to
 * 3. Upload multiple diverse files with varying characteristics
 * 4. Test sorting by created_at in descending order
 * 5. Test sorting by size in ascending order
 * 6. Test sorting by name in ascending and descending order
 * 7. Test sorting by extension to group files by type
 */
export async function test_api_article_files_sorting_options(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "testPassword123!",
    username: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 2: Create an article to attach files to
  const articleData = {
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 7 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IDiscussionBoardArticle.ICreate;

  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: articleData,
    },
  );
  typia.assert(article);

  // Step 3: Upload multiple files with varying characteristics
  const fileExtensions = ["pdf", "docx", "txt", "xlsx", "csv"] as const;
  const contentTypes = [
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/plain",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "text/csv",
  ] as const;

  const uploadedFiles: IDiscussionBoardArticleFile[] = [];

  for (let i = 0; i < 5; i++) {
    const ext = fileExtensions[i];
    const fileData = {
      original_filename: `${RandomGenerator.alphabets(8)}.${ext}`,
      file_size: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
      content_type: contentTypes[i],
      storage_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IDiscussionBoardArticleFile.ICreate;

    const uploadedFile =
      await api.functional.discussionBoard.member.articles.files.create(
        connection,
        {
          articleId: article.id,
          body: fileData,
        },
      );
    typia.assert(uploadedFile);
    uploadedFiles.push(uploadedFile);

    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  // Step 4: Test sorting by created_at in descending order (newest first)
  const sortedByDateDesc =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "created_at",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(sortedByDateDesc);

  TestValidator.predicate(
    "files sorted by created_at descending",
    sortedByDateDesc.data.length === uploadedFiles.length,
  );

  for (let i = 0; i < sortedByDateDesc.data.length - 1; i++) {
    const current = uploadedFiles.find(
      (f) => f.id === sortedByDateDesc.data[i].id,
    );
    const next = uploadedFiles.find(
      (f) => f.id === sortedByDateDesc.data[i + 1].id,
    );

    if (current && next) {
      TestValidator.predicate(
        "created_at descending order verification",
        new Date(current.created_at).getTime() >=
          new Date(next.created_at).getTime(),
      );
    }
  }

  // Step 5: Test sorting by size in ascending order (smallest to largest)
  const sortedBySizeAsc =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "size",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(sortedBySizeAsc);

  for (let i = 0; i < sortedBySizeAsc.data.length - 1; i++) {
    const currentSize = sortedBySizeAsc.data[i].size;
    const nextSize = sortedBySizeAsc.data[i + 1].size;

    TestValidator.predicate(
      "size ascending order verification",
      currentSize <= nextSize,
    );
  }

  // Step 6: Test sorting by name in ascending order
  const sortedByNameAsc =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "name",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(sortedByNameAsc);

  for (let i = 0; i < sortedByNameAsc.data.length - 1; i++) {
    const currentName = sortedByNameAsc.data[i].name;
    const nextName = sortedByNameAsc.data[i + 1].name;

    TestValidator.predicate(
      "name ascending order verification",
      currentName.localeCompare(nextName) <= 0,
    );
  }

  // Step 7: Test sorting by name in descending order
  const sortedByNameDesc =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "name",
        sort_order: "desc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(sortedByNameDesc);

  for (let i = 0; i < sortedByNameDesc.data.length - 1; i++) {
    const currentName = sortedByNameDesc.data[i].name;
    const nextName = sortedByNameDesc.data[i + 1].name;

    TestValidator.predicate(
      "name descending order verification",
      currentName.localeCompare(nextName) >= 0,
    );
  }

  // Step 8: Test sorting by extension to group files by type
  const sortedByExtension =
    await api.functional.discussionBoard.articles.files.index(connection, {
      articleId: article.id,
      body: {
        sort_by: "extension",
        sort_order: "asc",
      } satisfies IDiscussionBoardArticleFile.IRequest,
    });
  typia.assert(sortedByExtension);

  for (let i = 0; i < sortedByExtension.data.length - 1; i++) {
    const currentExt = sortedByExtension.data[i].extension;
    const nextExt = sortedByExtension.data[i + 1].extension;

    TestValidator.predicate(
      "extension ascending order verification",
      currentExt.localeCompare(nextExt) <= 0,
    );
  }
}
