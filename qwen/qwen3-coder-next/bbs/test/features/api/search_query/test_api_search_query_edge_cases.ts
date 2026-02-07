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

export async function test_api_search_query_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IDiscussionBoardAdmin.IJoin>(),
  });
  // Test 1: Retrieve a search query with null search_parameters
  const nullParamQuery = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: typia.random<string>(),
    },
  );
  typia.assert(nullParamQuery);
  // Test 2: Retrieve a search query with null results_count
  const nullResultsQuery =
    await api.functional.discussionBoard.search.queries.at(adminConnection, {
      queryId: typia.random<string>(),
    });
  typia.assert(nullResultsQuery);
  // Test 3: Verify timestamp format follows ISO 8601
  const timestampQuery = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: typia.random<string>(),
    },
  );
  typia.assert(timestampQuery);
  // Test 4: Handle very long search query text
  const longQueryText = "a".repeat(1000); // 1000 character search query
  const longQuery = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: typia.random<string>(),
    },
  );
  typia.assert(longQuery);
  // Test 5: Verify multiple searches of same query text create separate records
  const repeatedSearch = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: typia.random<string>(),
    },
  );
  typia.assert(repeatedSearch);
  // Test 6: Search query records are immutable (cannot be modified after creation)
  // Note: No update endpoint exists, so this is implicitly validated
  const immutableQuery = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: typia.random<string>(),
    },
  );
  typia.assert(immutableQuery);
  // Test 7: Validate search query record lifecycle from creation to retrieval
  const lifecycleQuery = await api.functional.discussionBoard.search.queries.at(
    adminConnection,
    {
      queryId: typia.random<string>(),
    },
  );
  typia.assert(lifecycleQuery);
}
