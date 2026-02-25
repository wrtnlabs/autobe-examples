import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticleSearchIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_article_search_index_search(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful search by an administrator with valid query
  // Scenario 2: Search yielding no results
  // Scenario 3: Unauthorized access attempt
  // Prepare a new administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(admin); // Assert the authorized administrator shape
  // Prepare search request bodies
  // Scenario 1: Search with a valid query
  const validSearchRequest: IDiscussionBoardArticleSearchIndex.IRequest = {
    search: "test",
    page: 1,
    limit: 5,
    sortOrder: "newest",
  };
  // Call search API as an authenticated admin
  const searchResult =
    await api.functional.discussionBoard.administrator.article_search_indexes.index(
      adminConnection,
      {
        body: validSearchRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata
  const pagination = searchResult.pagination;
  TestValidator.predicate(
    "valid search pagination current page",
    pagination.current === 1,
  );
  TestValidator.predicate(
    "valid search pagination limit",
    pagination.limit === 5,
  );
  TestValidator.predicate(
    "valid search pagination pages",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "valid search pagination records",
    pagination.records >= 0,
  );
  // Validate that data entries in page are summaries with required properties
  for (const item of searchResult.data) {
    typia.assert<IDiscussionBoardArticleSearchIndex.ISummary>(item);
    TestValidator.predicate(
      "search result item has non-empty title",
      item.title.length > 0,
    );
    TestValidator.predicate(
      "search result item has non-empty body",
      item.body.length >= 0,
    );
    TestValidator.predicate(
      "search result item has article summary with id",
      typeof item.article.id === "string" && item.article.id.length > 0,
    );
  }
  // Scenario 2: Search with no matching results
  const noMatchSearchRequest: IDiscussionBoardArticleSearchIndex.IRequest = {
    search: "nonexistingsubstringthatmatchesnothing",
    page: 1,
    limit: 5,
    sortOrder: "newest",
  };
  const noMatchResult =
    await api.functional.discussionBoard.administrator.article_search_indexes.index(
      adminConnection,
      { body: noMatchSearchRequest },
    );
  typia.assert(noMatchResult);
  TestValidator.equals(
    "no match search returns empty data",
    noMatchResult.data.length,
    0,
  );
  TestValidator.equals(
    "no match search page current",
    noMatchResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "no match search page limit",
    noMatchResult.pagination.limit,
    5,
  );
  TestValidator.equals(
    "no match search page pages",
    noMatchResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "no match search page records",
    noMatchResult.pagination.records,
    0,
  );
  // Scenario 3: Unauthorized access attempt
  // Use base connection without authentication header
  await TestValidator.httpError(
    "unauthorized search request",
    401,
    async () => {
      await api.functional.discussionBoard.administrator.article_search_indexes.index(
        connection,
        { body: validSearchRequest },
      );
    },
  );
}
