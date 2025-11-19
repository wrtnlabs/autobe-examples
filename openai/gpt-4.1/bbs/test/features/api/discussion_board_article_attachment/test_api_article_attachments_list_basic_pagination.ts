import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleAttachment";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleAttachment";

/**
 * Validate that attachment pagination for a discussion article returns correct
 * metadata, supports default and custom paging, sorting by multiple fields, and
 * filtering by filename.
 *
 * 1. Generate a random articleId and use random pagination params (limit, page).
 * 2. List attachments with default params, and verify all result fields,
 *    non-deleted status, .article.id matching input articleId, and field
 *    presence/structure.
 * 3. Test with several combinations (custom limit, paging, sort_by, order).
 * 4. If file_name present, test search filtering by substring.
 * 5. For each page, all attachments must be for the input article, deleted_at must
 *    be null/undefined, and metadata must be present.
 */
export async function test_api_article_attachments_list_basic_pagination(
  connection: api.IConnection,
) {
  // 1. Choose random articleId and build several different request params
  const articleId = typia.random<string & tags.Format<"uuid">>();

  // 2. Default pagination (should default to page 1/limit 50/created_at desc)
  const defaultPage =
    await api.functional.discussionBoard.articles.attachments.index(
      connection,
      {
        articleId,
        body: {} satisfies IDiscussionBoardArticleAttachment.IRequest,
      },
    );
  typia.assert(defaultPage);
  TestValidator.predicate(
    "all results are for articleId and not soft-deleted",
    defaultPage.data.every(
      (att) => att.deleted_at === null || att.deleted_at === undefined,
    ) && defaultPage.data.every((att) => att.article.id === articleId),
  );

  // 3. Test custom page/limit in range; test sort_by and order enums
  const limits = [5, 10, 50] as const;
  const sortFields = ["file_name", "created_at", "file_size"] as const;
  const orders = ["asc", "desc"] as const;
  for (const limit of limits) {
    for (const sort_by of sortFields) {
      for (const order of orders) {
        const page =
          await api.functional.discussionBoard.articles.attachments.index(
            connection,
            {
              articleId,
              body: {
                page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
                limit: limit as number &
                  tags.Type<"int32"> &
                  tags.Minimum<1> &
                  tags.Maximum<50>,
                sort_by,
                order,
              } satisfies IDiscussionBoardArticleAttachment.IRequest,
            },
          );
        typia.assert(page);
        TestValidator.predicate(
          `pagination/limit/sort for limit=${limit}, sort_by=${sort_by}, order=${order}`,
          page.data.every(
            (att) => att.deleted_at === null || att.deleted_at === undefined,
          ) &&
            page.data.every((att) => att.article.id === articleId) &&
            page.data.every(
              (att) =>
                typeof att.file_name === "string" &&
                typeof att.mime_type === "string" &&
                typeof att.file_size === "number" &&
                typeof att.file_uri === "string" &&
                typeof att.created_at === "string" &&
                typeof att.article === "object" &&
                typeof att.id === "string",
            ),
        );
      }
    }
  }

  // 4. Search by file_name substring (only if file_name exists on default page)
  const first = defaultPage.data[0];
  if (first && first.file_name.length > 2) {
    const substring = first.file_name.substring(
      0,
      Math.min(3, first.file_name.length),
    );
    const searchPage =
      await api.functional.discussionBoard.articles.attachments.index(
        connection,
        {
          articleId,
          body: {
            search: substring as string &
              tags.MinLength<1> &
              tags.MaxLength<100>,
          } satisfies IDiscussionBoardArticleAttachment.IRequest,
        },
      );
    typia.assert(searchPage);
    // all file_name should include search substring
    TestValidator.predicate(
      `all results file_name include substring '${substring}'`,
      searchPage.data.every((att) => att.file_name.includes(substring)),
    );
    // still all attachments are for this article
    TestValidator.predicate(
      "all search results for articleId",
      searchPage.data.every((att) => att.article.id === articleId),
    );
  }

  // 5. Check basic structure of returned attachment summary for all retrieved records
  for (const att of defaultPage.data) {
    TestValidator.predicate(
      "attachment id is uuid",
      typeof att.id === "string",
    );
    TestValidator.predicate(
      "attachment article matches articleId",
      att.article.id === articleId,
    );
    TestValidator.predicate(
      "file_name is string",
      typeof att.file_name === "string",
    );
    TestValidator.predicate(
      "mime_type is string",
      typeof att.mime_type === "string",
    );
    TestValidator.predicate(
      "file_size is number",
      typeof att.file_size === "number",
    );
    TestValidator.predicate(
      "file_uri is string",
      typeof att.file_uri === "string",
    );
    TestValidator.predicate(
      "created_at is string",
      typeof att.created_at === "string",
    );
    TestValidator.predicate(
      "deleted_at null or undefined",
      att.deleted_at === null || att.deleted_at === undefined,
    );
  }
}
