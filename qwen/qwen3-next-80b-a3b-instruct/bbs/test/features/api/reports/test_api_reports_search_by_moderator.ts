import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerator";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

export async function test_api_reports_search_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a new moderator
  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderator: IDiscussionBoardModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorEmail,
    });
  typia.assert(moderator);

  // 2. Prepare and send search request
  // IRequest is defined as string, so we need to serialize an object to JSON
  const searchQuery: IDiscussionBoardReport.IRequest = JSON.stringify({
    page: 0,
    limit: 10,
  });

  const searchResults: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.moderator.reports.index(connection, {
      body: searchQuery,
    });
  typia.assert(searchResults);

  // 3. Validate top-level structure of response
  TestValidator.equals(
    "response has pagination property",
    searchResults.pagination,
    {
      current: 0,
      limit: 10,
      records: searchResults.pagination.records,
      pages: searchResults.pagination.pages,
    } satisfies IPage.IPagination,
  );

  TestValidator.predicate(
    "response data is an array",
    Array.isArray(searchResults.data),
  );

  TestValidator.equals(
    "search result count matches pagination",
    searchResults.data.length,
    searchResults.pagination.records <= 10
      ? searchResults.pagination.records
      : 10,
  );
}
