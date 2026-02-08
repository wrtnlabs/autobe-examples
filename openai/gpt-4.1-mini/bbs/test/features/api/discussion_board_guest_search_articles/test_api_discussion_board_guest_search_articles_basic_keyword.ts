import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardGuest";
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

export async function test_api_discussion_board_guest_search_articles_basic_keyword(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Basic keyword search returning matching articles.
  // - Send a search request with a keyword in the title or content filter.
  // - Verify that the response contains a paginated list of articles matching the keyword.
  // - Check that each article summary includes title, author info, tags, comment count, and posting time.
  // - Verify pagination metadata is accurate, including current page, limit, total records, and total pages.
  // - Confirm sorting order defaults to newest first or respects the provided sorting parameter.
  // Actor-specific guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  // Authorize guest join
  const token = await authorize_guest_join(guestConnection, { body: {} });
  // Set Authorization header
  guestConnection.headers = { Authorization: `Bearer ${token.token.access}` };
  // Call search endpoint with empty query (since no filter props defined in IRequest schema)
  const body: IDiscussionBoardArticle.IRequest = {}; // Empty object per schema
  const output =
    await api.functional.discussionBoard.guest.search.articles.index(
      guestConnection,
      { body },
    );
  // Verify response type
  typia.assert(output);
  // Validate pagination
  const pagination = output.pagination;
  TestValidator.predicate(
    "current page is non-negative",
    typeof pagination.current === "number" && pagination.current >= 0,
  );
  TestValidator.predicate(
    "limit is non-negative",
    typeof pagination.limit === "number" && pagination.limit >= 0,
  );
  TestValidator.predicate(
    "records is non-negative",
    typeof pagination.records === "number" && pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    typeof pagination.pages === "number" && pagination.pages >= 0,
  );
  // Validate data array
  TestValidator.predicate("data is array", Array.isArray(output.data));
  // Validate each article summary item has at least keys (title, author, tags, comment_count, posted_at) - but schema is empty so we trust typia.assert only
}
