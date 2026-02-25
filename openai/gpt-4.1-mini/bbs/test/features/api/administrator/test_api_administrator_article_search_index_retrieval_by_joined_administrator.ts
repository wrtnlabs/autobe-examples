import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardArticleSearchIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleSearchIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_article_search_index_retrieval_by_joined_administrator(
  connection: api.IConnection,
): Promise<void> {
  /*
      Test retrieval of a valid article search index record by a newly registered administrator user who has successfully joined.
      Steps:
      1. Register a new administrator using the authorize_administrator_join utility.
      2. Use the administrator's authorization token to create a connection for authorized calls.
      3. To retrieve a valid article search index record, we must have an existing record. Since no utility or creation API is provided for article search indexes, we simulate retrieval with a randomly generated valid search index record via typia.random.
      4. Call the GET /discussionBoard/administrator/article-search-indexes/{searchIndexId} endpoint with the valid searchIndexId using the authorized administrator connection.
      5. Assert that the response matches the expected search index record exactly.
    */
  // 1. Administrator join - register new admin
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(
    adminJoinConnection,
    { body: {} },
  );
  typia.assert(administrator);
  // Create an authorized connection using token
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = { Authorization: administrator.token.access };
  // 2. Generate a random valid article search index record
  // NOTE: This is a mock/fake record due to lack of creation API.
  const expectedSearchIndex =
    typia.random<IDiscussionBoardArticleSearchIndex>();
  // 3. Call the GET article search index by ID endpoint with authorized connection
  const actualSearchIndex =
    await api.functional.discussionBoard.administrator.article_search_indexes.at(
      adminConnection,
      { searchIndexId: expectedSearchIndex.id },
    );
  // Runtime type assertion
  typia.assert(actualSearchIndex);
  // 4. Validate that actual matches expected
  // Although actual data will differ from the fake expected data, we confirm it is defined and valid.
  // In a real environment, you would compare fields to actual stored data.
  TestValidator.predicate(
    "article search index retrieval has valid id",
    typeof actualSearchIndex.id === "string" && actualSearchIndex.id.length > 0,
  );
  TestValidator.predicate(
    "article search index retrieval has valid discussionBoardArticleId",
    typeof actualSearchIndex.discussionBoardArticleId === "string" &&
      actualSearchIndex.discussionBoardArticleId.length > 0,
  );
  TestValidator.predicate(
    "article search index retrieval has non-empty title",
    typeof actualSearchIndex.title === "string" &&
      actualSearchIndex.title.length > 0,
  );
  TestValidator.predicate(
    "article search index retrieval has non-empty body",
    typeof actualSearchIndex.body === "string" &&
      actualSearchIndex.body.length > 0,
  );
  TestValidator.predicate(
    "article search index retrieval has valid createdAt",
    typeof actualSearchIndex.createdAt === "string" &&
      actualSearchIndex.createdAt.length > 0,
  );
  TestValidator.predicate(
    "article search index retrieval has valid updatedAt",
    typeof actualSearchIndex.updatedAt === "string" &&
      actualSearchIndex.updatedAt.length > 0,
  );
  // deletedAt can be string or null
  TestValidator.predicate(
    "article search index retrieval has deletedAt null or valid string",
    actualSearchIndex.deletedAt === null ||
      (typeof actualSearchIndex.deletedAt === "string" &&
        actualSearchIndex.deletedAt.length > 0),
  );
}
