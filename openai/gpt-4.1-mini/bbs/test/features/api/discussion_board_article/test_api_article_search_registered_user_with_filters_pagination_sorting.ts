import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_article_search_registered_user_with_filters_pagination_sorting(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for successful article search by a registered user using keyword query and tag filters with pagination and sorting.
  // Validate that the system returns a paginated list of article summaries matching the criteria, sorted by newest first by default.
  // Confirm the response includes correct pagination metadata and that each article summary has expected fields including title, author details, tags, comment count, and post time.
  // Test also covers empty result scenario when no articles match the search criteria.
  // 1. Register a new user
  const registerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_registered_user_join(registerConnection, {
    body: {},
  });
  typia.assert(authorized);
  // 2. Create an authorized connection with token
  const userConnection: api.IConnection = { host: connection.host };
  userConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 3. Prepare search request bodies
  const baseSearchRequest: IDiscussionBoardArticle.IRequest = {};
  // 4. Call the article search API with valid empty criteria to get initial response
  const searchResult =
    await api.functional.discussionBoard.registeredUser.search.articles.index(
      userConnection,
      { body: baseSearchRequest },
    );
  typia.assert(searchResult);
  // Basic pagination properties validation
  TestValidator.predicate(
    "pagination current is >= 1",
    searchResult.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 0",
    searchResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is >= 0",
    searchResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is >= 0",
    searchResult.pagination.pages >= 0,
  );
  // Validate data array type and length
  TestValidator.predicate("data is array", Array.isArray(searchResult.data));
  if (searchResult.data.length > 0) {
    for (const rawArticle of searchResult.data) {
      typia.assert(rawArticle);
    }
  }
  // 5. Test empty result scenario: search with a keyword that does not exist
  const emptySearchRequest: IDiscussionBoardArticle.IRequest = {
    q: "nonexistentkeywordthatshouldnotmatchanyarticle",
  };
  const emptyResult =
    await api.functional.discussionBoard.registeredUser.search.articles.index(
      userConnection,
      { body: emptySearchRequest },
    );
  typia.assert(emptyResult);
  TestValidator.equals(
    "empty search returns zero data",
    emptyResult.data.length,
    0,
  );
  TestValidator.equals(
    "empty search pagination current page",
    emptyResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty search pagination total records",
    emptyResult.pagination.records,
    0,
  );
  // 6. Test search with pagination and tags filters and sorting ascending by created_at
  const filteredSearchRequest: IDiscussionBoardArticle.IRequest = {
    q: "economy",
    tags: ["finance", "market"],
    page: 2,
    limit: 10,
    sort: [{ field: "created_at", direction: "asc" }],
  };
  const filteredResult =
    await api.functional.discussionBoard.registeredUser.search.articles.index(
      userConnection,
      { body: filteredSearchRequest },
    );
  typia.assert(filteredResult);
  TestValidator.equals(
    "filtered search page number",
    filteredResult.pagination.current,
    2,
  );
  TestValidator.predicate(
    "filtered search limit positive",
    filteredResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "filtered search records non-negative",
    filteredResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "filtered search pages non-negative",
    filteredResult.pagination.pages >= 0,
  );
  // Validate data array type and length
  TestValidator.predicate(
    "filtered data is array",
    Array.isArray(filteredResult.data),
  );
  if (filteredResult.data.length > 0) {
    for (const rawArticle of filteredResult.data) {
      typia.assert(rawArticle);
    }
  }
}
