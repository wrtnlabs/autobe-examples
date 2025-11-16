import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";

/**
 * Validate public access for listing attachments of a discussion board article.
 *
 * This test verifies that the public (non-authenticated) endpoint patch
 * /discussionBoard/articles/{articleId}/attachments allows any user to access a
 * paginated list of attachment metadata for a given article. No authentication
 * token is included for the main query. The article must be created via
 * legitimate signup and creation flows, but attachment list retrieval is always
 * public.
 *
 * Test Flow:
 *
 * 1. Register a discussion board user (join).
 * 2. Create a new article using the user.
 * 3. Derive a public (unauthenticated) connection by emptying the headers.
 * 4. Query the attachment list with no filters for the created article. Assert an
 *    empty array is returned (since no attachments exist yet) and pagination is
 *    valid.
 * 5. Query again with various impossible filters (random file_name, file_type, and
 *    narrow upload date range), always expecting empty results.
 * 6. Simulate a request for a non-existent or deleted article (use random UUID).
 *    Expect an error (TestValidator.error) for trying to list attachments of a
 *    deleted or non-existent article.
 * 7. Confirm all these actions work for unauthenticated access (no token in
 *    headers).
 */
export async function test_api_article_attachment_list_by_public(
  connection: api.IConnection,
) {
  // 1. Register a discussion board user
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const user = await api.functional.auth.user.join(connection, {
    body: {
      email,
      password,
      href: "https://example.com/join",
      referrer: "https://example.com/landing",
      ip: undefined,
    } satisfies IDiscussionBoardUser.ICreate,
  });
  typia.assert(user);

  // 2. Create a new article as that user
  const article = await api.functional.discussionBoard.user.articles.create(
    connection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 6,
          wordMax: 12,
        }),
        body: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 20,
          sentenceMax: 30,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IDiscussionBoardArticle.ICreate,
    },
  );
  typia.assert(article);

  // 3. Create a public (unauthenticated) connection
  const publicConn: api.IConnection = { ...connection, headers: {} };

  // 4. Query the attachment list (no filters)
  const list1 = await api.functional.discussionBoard.articles.attachments.index(
    publicConn,
    {
      articleId: article.id,
      body: {},
    },
  );
  typia.assert(list1);
  TestValidator.equals("pagination page is 1", list1.pagination.current, 1);
  TestValidator.predicate(
    "pagination limit positive",
    list1.pagination.limit > 0,
  );
  TestValidator.equals("no attachments", list1.data.length, 0);
  TestValidator.equals("no records", list1.pagination.records, 0);
  TestValidator.equals("no pages", list1.pagination.pages, 0);

  // 5. Query with filters that cannot match anything
  const impossibleFilters: IDiscussionBoardArticleAttachment.IRequest[] = [
    { file_name: RandomGenerator.alphaNumeric(24) },
    { file_type: "image/fake-type" },
    {
      uploaded_date_start: new Date(Date.now() + 1000000).toISOString(),
      uploaded_date_end: new Date(Date.now() + 2000000).toISOString(),
    },
    {
      file_name: RandomGenerator.alphaNumeric(8),
      file_type: "application/ghost",
      uploaded_date_start: new Date(Date.now() + 1000000).toISOString(),
    },
  ];
  for (const reqBody of impossibleFilters) {
    const filtered =
      await api.functional.discussionBoard.articles.attachments.index(
        publicConn,
        {
          articleId: article.id,
          body: reqBody,
        },
      );
    typia.assert(filtered);
    TestValidator.equals(
      "pagination page is 1 (filter)",
      filtered.pagination.current,
      1,
    );
    TestValidator.equals("no records (filter)", filtered.pagination.records, 0);
    TestValidator.equals("no pages (filter)", filtered.pagination.pages, 0);
    TestValidator.equals("no attachments (filter)", filtered.data.length, 0);
  }

  // 6. Use random UUID for deleted/non-existent article and expect error
  const fakeArticleId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "error on accessing deleted/nonexistent article",
    async () => {
      await api.functional.discussionBoard.articles.attachments.index(
        publicConn,
        {
          articleId: fakeArticleId,
          body: {},
        },
      );
    },
  );
}
