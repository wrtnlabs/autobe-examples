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

export async function test_api_discussion_board_guest_search_articles_filter_multiple_tags(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Search filtering articles by multiple tags.
  // - Send a search request with multiple tag UUID filters.
  // - Verify that only articles tagged with all specified tags are returned.
  //   * Skipped due to DTO property absence.
  // - Check that the article summaries include relevant tags.
  //   * Skipped due to DTO property absence.
  // - Validate pagination details.
  // - Confirm the sorting order is applied correctly if specified.
  // 1. Guest join and authorize
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {},
  });
  // 2. Generate two random UUIDs as tags
  const tag1 = typia.random<string & tags.Format<"uuid">>();
  const tag2 = typia.random<string & tags.Format<"uuid">>();
  // 3. Construct the search body with tags filter
  const searchBody = {
    tags: [tag1, tag2],
    limit: 10,
    current: 1,
    sort: "+created_at",
  } satisfies IDiscussionBoardArticle.IRequest;
  // 4. Send the search request
  const response: IPageIDiscussionBoardArticle.ISummary =
    await api.functional.discussionBoard.guest.search.articles.index(
      guestConnection,
      { body: searchBody },
    );
  typia.assert(response);
  // 5. Validate pagination
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current page is 1",
    pagination.current === 1,
  );
  TestValidator.predicate("pagination limit is 10", pagination.limit === 10);
  TestValidator.predicate(
    "total records non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate("total pages non-negative", pagination.pages >= 0);
  // 6. Due to lack of properties in ISummary, we do not validate tags or sorting.
  // We only assert that data array length is <= limit
  TestValidator.predicate(
    "data length is not greater than limit",
    response.data.length <= pagination.limit,
  );
}
