import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_discovery_default_sort(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection for the test
  const baseConnection: api.IConnection = { host: connection.host };
  // Perform default discovery query with no parameters
  const result = await api.functional.community.communities.index(
    baseConnection,
    {
      body: {},
    },
  );
  typia.assert(result);
  // Validate pagination object as required by schema
  TestValidator.equals(
    "pagination current page is 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", result.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records > 0",
    result.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages >= 1",
    result.pagination.pages >= 1,
  );
  // Validate data array structure according to schema
  TestValidator.predicate("data array exists", Array.isArray(result.data));
  TestValidator.predicate(
    "data array has at least one community",
    result.data.length > 0,
  );
  // Since ICommunityCommunity.ISummary is an empty object {},
  // we cannot validate any properties within the community summaries
  // as they don't exist according to the provided schema
}
