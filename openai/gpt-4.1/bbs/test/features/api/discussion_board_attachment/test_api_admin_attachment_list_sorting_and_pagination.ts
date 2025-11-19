import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAttachment";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAttachment";

/**
 * Validate attachment pagination and various sorts as admin.
 *
 * 1. Join as admin (register & authenticate).
 * 2. For each of the three sort fields (created_at, size_bytes,
 *    original_filename): a. Test ascending and descending order with default
 *    (limit: 20) and small (limit: 3) limits. b. For each, fetch first page and
 *    last page, validate data order and pagination correctness.
 */
export async function test_api_admin_attachment_list_sorting_and_pagination(
  connection: api.IConnection,
) {
  // 1. Admin registration
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: RandomGenerator.alphaNumeric(12),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  const adminAuth = await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });
  typia.assert(adminAuth);

  // 2. Define sort fields and order
  const sortFields = ["created_at", "size_bytes", "original_filename"] as const;
  const sortOrders = ["asc", "desc"] as const;
  const limits = [20, 3];

  for (const sort_by of sortFields) {
    for (const order of sortOrders) {
      for (const limit of limits) {
        // -- First page test --
        const req1 = {
          sort_by,
          order,
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: limit as number &
            tags.Type<"int32"> &
            tags.Minimum<1> &
            tags.Maximum<100>,
        } satisfies IDiscussionBoardAttachment.IRequest;
        const page1 =
          await api.functional.discussionBoard.admin.attachments.index(
            connection,
            { body: req1 },
          );
        typia.assert(page1);
        TestValidator.equals(
          `pagination: first page for ${sort_by} ${order} (limit ${limit})`,
          page1.pagination.current,
          1,
        );
        TestValidator.predicate(
          `pagination: page1 data size <= limit for ${sort_by} ${order}`,
          page1.data.length <= limit,
        );
        // Validate sort ordering for the received data
        if (page1.data.length > 1) {
          const fieldExtractor = (a: IDiscussionBoardAttachment): any =>
            sort_by === "size_bytes"
              ? a.size_bytes
              : sort_by === "created_at"
                ? a.created_at
                : a.original_filename;
          for (let i = 1; i < page1.data.length; ++i) {
            const prev = fieldExtractor(page1.data[i - 1]);
            const curr = fieldExtractor(page1.data[i]);
            if (order === "asc") {
              TestValidator.predicate(
                `first page sort[${i}] ascending by ${sort_by}`,
                prev <= curr,
              );
            } else {
              TestValidator.predicate(
                `first page sort[${i}] descending by ${sort_by}`,
                prev >= curr,
              );
            }
          }
        }
        // -- Last page test --
        const totalPages = page1.pagination.pages;
        if (totalPages > 0) {
          const reqLast = {
            sort_by,
            order,
            page: totalPages as number & tags.Type<"int32"> & tags.Minimum<1>,
            limit: limit as number &
              tags.Type<"int32"> &
              tags.Minimum<1> &
              tags.Maximum<100>,
          } satisfies IDiscussionBoardAttachment.IRequest;
          const pageLast =
            await api.functional.discussionBoard.admin.attachments.index(
              connection,
              { body: reqLast },
            );
          typia.assert(pageLast);
          TestValidator.equals(
            `pagination: last page number for ${sort_by} ${order} (limit ${limit})`,
            pageLast.pagination.current,
            totalPages,
          );
          TestValidator.predicate(
            `pagination: last page data size <= limit for ${sort_by} ${order}`,
            pageLast.data.length <= limit,
          );
          // Validate sort order for last page data
          if (pageLast.data.length > 1) {
            const fieldExtractor = (a: IDiscussionBoardAttachment): any =>
              sort_by === "size_bytes"
                ? a.size_bytes
                : sort_by === "created_at"
                  ? a.created_at
                  : a.original_filename;
            for (let i = 1; i < pageLast.data.length; ++i) {
              const prev = fieldExtractor(pageLast.data[i - 1]);
              const curr = fieldExtractor(pageLast.data[i]);
              if (order === "asc") {
                TestValidator.predicate(
                  `last page sort[${i}] ascending by ${sort_by}`,
                  prev <= curr,
                );
              } else {
                TestValidator.predicate(
                  `last page sort[${i}] descending by ${sort_by}`,
                  prev >= curr,
                );
              }
            }
          }
        }
      }
    }
  }
}
