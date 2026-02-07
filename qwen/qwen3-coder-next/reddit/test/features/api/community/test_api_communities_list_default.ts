import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformCommunity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_communities_list_default(
  connection: api.IConnection,
): Promise<void> {
  // Call the communities list endpoint without any filters or pagination
  const result = await api.functional.redditPlatform.communities.index(
    connection,
    {
      body: {},
    },
  );
  // Validate the response structure with complete type validation
  typia.assert(result);
  // Verify pagination metadata exists
  TestValidator.predicate("has pagination", result.pagination !== null);
  // Validate pagination fields
  const { pagination } = result;
  TestValidator.equals("current page is 1", pagination.current, 1);
  TestValidator.predicate("limit is positive", pagination.limit > 0);
  TestValidator.predicate("records is non-negative", pagination.records >= 0);
  TestValidator.predicate("pages is non-negative", pagination.pages >= 0);
  // Verify data array exists
  TestValidator.predicate("has data array", Array.isArray(result.data));
}
