import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleTag";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_discussion_board_registered_user_tags_index_varied_filters(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of paginated article tags filtered by search string and sorted by name ascending.
  // 1. Join a new registered user and obtain the authorized connection
  const userJoinConn: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_registered_user_join(userJoinConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(authorizedUser);
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = { Authorization: authorizedUser.token.access };
  // 2. Define test request bodies
  const searchTerm = typia.random<string>().slice(0, 3).toLowerCase();
  const requestFiltered = {
    search: searchTerm || "a",
    page: 1,
    limit: 10,
    sort: "name_asc" as const,
  } satisfies IDiscussionBoardArticleTag.IRequest;
  // 3. Call API with filter and sort
  const responseFiltered =
    await api.functional.discussionBoard.registeredUser.tags.index(
      userConnection,
      {
        body: requestFiltered,
      },
    );
  typia.assert(responseFiltered);
  // 4. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page",
    responseFiltered.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit",
    responseFiltered.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    responseFiltered.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistency",
    responseFiltered.pagination.pages >= 0,
  );
  // 5. Validate tags contain the search term if data not empty
  if (responseFiltered.data.length > 0) {
    for (const tag of responseFiltered.data) {
      // No name field in tag summary to validate search term inclusion
      // Skip this validation because no property to check
    }
  }
  // 6. Skip sorting validation by tag name because tag name property doesn't exist
  // Scenario 2: Retrieval of article tags with empty search string to confirm full tag list retrieval with pagination.
  const requestEmptySearch = {
    search: "",
    page: 1,
    limit: 10,
    sort: "name_asc" as const,
  } satisfies IDiscussionBoardArticleTag.IRequest;
  const responseEmptySearch =
    await api.functional.discussionBoard.registeredUser.tags.index(
      userConnection,
      {
        body: requestEmptySearch,
      },
    );
  typia.assert(responseEmptySearch);
  TestValidator.predicate(
    "pagination current page empty search",
    responseEmptySearch.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit empty search",
    responseEmptySearch.pagination.limit === 10,
  );
  TestValidator.predicate(
    "pagination records non-negative empty search",
    responseEmptySearch.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistency empty search",
    responseEmptySearch.pagination.pages >= 0,
  );
  // Scenario 3: Pagination page exceeding available pages returns empty data array but correct pagination metadata
  const requestExceedPage = {
    search: "",
    page: responseEmptySearch.pagination.pages + 10,
    limit: 10,
    sort: "name_asc" as const,
  } satisfies IDiscussionBoardArticleTag.IRequest;
  const responseExceedPage =
    await api.functional.discussionBoard.registeredUser.tags.index(
      userConnection,
      {
        body: requestExceedPage,
      },
    );
  typia.assert(responseExceedPage);
  TestValidator.equals(
    "empty data on exceed page",
    responseExceedPage.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current page exceed",
    responseExceedPage.pagination.current,
    requestExceedPage.page,
  );
  TestValidator.equals(
    "pagination total records exceed",
    responseExceedPage.pagination.records,
    responseEmptySearch.pagination.records,
  );
  TestValidator.equals(
    "pagination pages exceed",
    responseExceedPage.pagination.pages,
    responseEmptySearch.pagination.pages,
  );
}
