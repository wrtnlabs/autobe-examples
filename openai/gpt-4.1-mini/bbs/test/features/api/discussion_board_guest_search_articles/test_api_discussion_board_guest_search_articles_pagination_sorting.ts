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

export async function test_api_discussion_board_guest_search_articles_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 3: Pagination and sorting behavior in search results.
  // Note: The IDiscussionBoardArticle.IRequest schema is empty; it does not officially support pagination or sorting parameters.
  // Therefore, this test calls the endpoint with an empty request body and verifies the response's pagination data structure.
  // Step 1: Authorize guest join to obtain guest token and updated connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, { body: {} });
  // Step 2: Call the search articles index endpoint with empty body
  const response =
    await api.functional.discussionBoard.guest.search.articles.index(
      guestConnection,
      { body: {} },
    );
  typia.assert(response);
  // Step 3: Validate pagination metadata
  TestValidator.predicate(
    "pagination current is non-negative",
    response.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is non-negative",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  // Step 4: Validate data array size does not exceed pagination limit
  TestValidator.predicate(
    "data length does not exceed pagination limit",
    response.data.length <= response.pagination.limit,
  );
}
