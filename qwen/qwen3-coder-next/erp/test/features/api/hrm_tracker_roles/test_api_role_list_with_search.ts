import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmTrackerRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_role_list_with_search(
  connection: api.IConnection,
): Promise<void> {
  // 1. Set up admin connection for role listing
  const adminConnection: api.IConnection = { host: connection.host };
  // 2. Test search with partial match in role names
  const searchResults = await api.functional.hrmTracker.roles.index(
    adminConnection,
    {
      body: {
        name: "",
        is_custom: true,
        is_default: false,
        page: 1,
        limit: 10,
        search: "manager",
      } satisfies IHrmTrackerRole.IRequest,
    },
  );
  typia.assert(searchResults);
  // 3. Validate search results structure and pagination
  TestValidator.predicate("has data array", searchResults.data.length >= 0);
  TestValidator.equals("pagination exists", !!searchResults.pagination, true);
  TestValidator.predicate(
    "pagination valid",
    searchResults.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination valid",
    searchResults.pagination.records >= 0,
  );
  // 4. Test search with no matching results
  const noMatchResults = await api.functional.hrmTracker.roles.index(
    adminConnection,
    {
      body: {
        name: "",
        is_custom: true,
        is_default: false,
        page: 1,
        limit: 10,
        search: "nonexistentsearchterm12345",
      } satisfies IHrmTrackerRole.IRequest,
    },
  );
  typia.assert(noMatchResults);
  TestValidator.equals("no match results empty", noMatchResults.data.length, 0);
  TestValidator.equals(
    "no match pagination records",
    noMatchResults.pagination.records,
    0,
  );
}
