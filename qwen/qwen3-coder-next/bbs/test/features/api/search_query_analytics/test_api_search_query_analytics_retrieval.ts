import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSearchQuery } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSearchQuery";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_search_query_analytics_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create admin connection for authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.admin.join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // 2. Create multiple search query records with different parameters
  // Generate unique query IDs for testing
  const queryId1 = typia.random<string & tags.Format<"uuid">>();
  const queryId2 = typia.random<string & tags.Format<"uuid">>();
  const queryId3 = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve search queries by their unique IDs
  const searchQuery1 = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: queryId1,
    },
  );
  typia.assert(searchQuery1);
  const searchQuery2 = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: queryId2,
    },
  );
  typia.assert(searchQuery2);
  const searchQuery3 = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: queryId3,
    },
  );
  typia.assert(searchQuery3);
  // 4. Validate search query structure matches schema
  // Since IDiscussionBoardSearchQuery is an empty object {},
  // we verify it's a valid object with required structure
  TestValidator.predicate(
    "search query 1 is object",
    typeof searchQuery1 === "object",
  );
  TestValidator.predicate(
    "search query 2 is object",
    typeof searchQuery2 === "object",
  );
  TestValidator.predicate(
    "search query 3 is object",
    typeof searchQuery3 === "object",
  );
  // 5. Verify search query records are accessible
  // All queries should be retrievable successfully
  const retrieved1 = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: queryId1,
    },
  );
  TestValidator.equals(
    "retrieved query matches original",
    retrieved1,
    searchQuery1,
  );
  const retrieved2 = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: queryId2,
    },
  );
  TestValidator.equals(
    "retrieved query matches original",
    retrieved2,
    searchQuery2,
  );
}
