import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_discussion_board_guest_search_articles_pagination_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // This test checks pagination on the guest article search with boundary pages
  // 1. Create a guest connection and authenticate via guest join utility
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(16),
      userAgent: "Mozilla/5.0 (compatible; AutoBE-TestBot/1.0)",
      ipAddress: "127.0.0.1",
      anonymousId: RandomGenerator.alphaNumeric(12),
    } satisfies IDiscussionBoardGuest.IJoin,
  });
  // Set authorization token in guestConnection for subsequent calls
  guestConnection.headers = { Authorization: guestAuth.token.access };
  // We'll test with a fixed limit per page
  const limit = 5 as const;
  // 2. Search first page (page=1) with a neutral but non-null search parameter to get total count
  const firstPageRequest = {
    search: null,
    page: 1,
    limit: limit,
    sort: "newest",
  } satisfies IDiscussionBoardArticle.IRequest;
  const firstPageResult =
    await api.functional.discussionBoard.guest.search.articles.index(
      guestConnection,
      { body: firstPageRequest },
    );
  typia.assert(firstPageResult);
  // Validate pagination info for first page
  TestValidator.equals(
    "pagination current page",
    firstPageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    firstPageResult.pagination.limit,
    limit,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    firstPageResult.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    firstPageResult.pagination.records >= 0,
  );
  // 3. Search last page (page=pages) to test boundary
  const lastPage = firstPageResult.pagination.pages;
  if (lastPage === 0) {
    // If no records, data array must be empty
    TestValidator.equals(
      "no records data empty",
      firstPageResult.data.length,
      0,
    );
  } else {
    // Last page search
    const lastPageRequest = {
      search: null,
      page: lastPage,
      limit: limit,
      sort: "newest",
    } satisfies IDiscussionBoardArticle.IRequest;
    const lastPageResult =
      await api.functional.discussionBoard.guest.search.articles.index(
        guestConnection,
        { body: lastPageRequest },
      );
    typia.assert(lastPageResult);
    TestValidator.equals(
      "pagination current page last",
      lastPageResult.pagination.current,
      lastPage,
    );
    TestValidator.equals(
      "pagination limit last",
      lastPageResult.pagination.limit,
      limit,
    );
    TestValidator.predicate(
      "data length at last page",
      lastPageResult.data.length <= limit,
    );
    // 4. Search beyond last page (page=lastPage + 1) to ensure empty data, graceful handling
    const beyondLastPageRequest = {
      search: null,
      page: lastPage + 1,
      limit: limit,
      sort: "newest",
    } satisfies IDiscussionBoardArticle.IRequest;
    const beyondLastPageResult =
      await api.functional.discussionBoard.guest.search.articles.index(
        guestConnection,
        { body: beyondLastPageRequest },
      );
    typia.assert(beyondLastPageResult);
    TestValidator.equals(
      "pagination current beyond last page",
      beyondLastPageResult.pagination.current,
      lastPage + 1,
    );
    TestValidator.equals(
      "pagination limit beyond last page",
      beyondLastPageResult.pagination.limit,
      limit,
    );
    TestValidator.equals(
      "data length beyond last page",
      beyondLastPageResult.data.length,
      0,
    );
  }
}
