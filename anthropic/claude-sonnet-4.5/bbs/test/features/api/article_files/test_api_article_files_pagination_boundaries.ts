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
 * Test pagination behavior at boundary conditions including first page, last
 * page, and beyond available data.
 *
 * This scenario validates correct pagination metadata calculation and handling
 * of edge cases:
 *
 * 1. Create a member account for authentication
 * 2. Create an article to attach files to
 * 3. Upload exactly 7 files to create controlled pagination boundaries
 * 4. Query with limit=3 to create 3 pages (3+3+1 files)
 * 5. Retrieve page 1 and verify it contains 3 files with correct pagination
 *    metadata
 * 6. Retrieve page 3 (last page) and verify it contains 1 file with correct
 *    metadata
 * 7. Attempt to retrieve page 4 (beyond available data) and verify graceful
 *    handling
 * 8. Verify that pagination metadata remains mathematically consistent across all
 *    requests
 */
export async function test_api_article_files_pagination_boundaries(
  connection: api.IConnection,
) {
  // Step 1: Create member account for authentication
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const memberUsername = RandomGenerator.name();

  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      username: memberUsername,
      href: "https://test.example.com/signup",
      referrer: "https://test.example.com/home",
    } satisfies IDiscussionBoardMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create article for file attachments
  const article = await api.functional.discussionBoard.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 3 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // Step 3: Upload exactly 7 files to create boundary conditions
  const uploadedFiles: IDiscussionBoardArticleFile[] = [];

  for (let i = 0; i < 7; i++) {
    const file =
      await api.functional.discussionBoard.member.articles.files.create(
        connection,
        {
          articleId: article.id,
          body: {
            original_filename: `test_file_${i + 1}.pdf`,
            file_size: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<1>
            >(),
            content_type: "application/pdf",
            storage_url: `https://storage.example.com/files/${typia.random<string & tags.Format<"uuid">>()}.pdf`,
          } satisfies IDiscussionBoardArticleFile.ICreate,
        },
      );
    typia.assert(file);
    uploadedFiles.push(file);
  }

  // Step 4: Retrieve page 1 with limit 3 (should contain 3 files)
  const page1 = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 1,
        limit: 3,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(page1);

  // Validate page 1 content and pagination metadata
  TestValidator.equals("page 1 should contain 3 files", page1.data.length, 3);
  TestValidator.equals("page 1 current page", page1.pagination.current, 1);
  TestValidator.equals("page 1 limit", page1.pagination.limit, 3);
  TestValidator.equals("page 1 total records", page1.pagination.records, 7);
  TestValidator.equals("page 1 total pages", page1.pagination.pages, 3);

  // Step 5: Retrieve page 3 (last page, should contain 1 file)
  const page3 = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 3,
        limit: 3,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(page3);

  // Validate page 3 content and pagination metadata
  TestValidator.equals("page 3 should contain 1 file", page3.data.length, 1);
  TestValidator.equals("page 3 current page", page3.pagination.current, 3);
  TestValidator.equals("page 3 limit", page3.pagination.limit, 3);
  TestValidator.equals("page 3 total records", page3.pagination.records, 7);
  TestValidator.equals("page 3 total pages", page3.pagination.pages, 3);

  // Step 6: Attempt to retrieve page 4 (beyond available data)
  const page4 = await api.functional.discussionBoard.articles.files.index(
    connection,
    {
      articleId: article.id,
      body: {
        page: 4,
        limit: 3,
      } satisfies IDiscussionBoardArticleFile.IRequest,
    },
  );
  typia.assert(page4);

  // Validate graceful handling of beyond-available-data scenario
  TestValidator.equals(
    "page 4 should have empty data array",
    page4.data.length,
    0,
  );
  TestValidator.equals(
    "page 4 total records should still be 7",
    page4.pagination.records,
    7,
  );
  TestValidator.equals(
    "page 4 total pages should still be 3",
    page4.pagination.pages,
    3,
  );

  // Step 7: Verify pagination metadata mathematical consistency
  const expectedPages = Math.ceil(7 / 3);
  TestValidator.equals(
    "calculated pages should match metadata",
    expectedPages,
    3,
  );

  // Verify consistency across all retrieved pages
  TestValidator.predicate(
    "all pages have consistent total records",
    page1.pagination.records === page3.pagination.records &&
      page3.pagination.records === page4.pagination.records,
  );

  TestValidator.predicate(
    "all pages have consistent total pages",
    page1.pagination.pages === page3.pagination.pages &&
      page3.pagination.pages === page4.pagination.pages,
  );

  TestValidator.predicate(
    "pagination math is consistent",
    page1.pagination.pages ===
      Math.ceil(page1.pagination.records / page1.pagination.limit),
  );
}
