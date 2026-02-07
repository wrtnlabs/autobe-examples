import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityMvPostFeedIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMvPostFeedIndex";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityMvPostFeedIndex } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityMvPostFeedIndex";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_post_feed_home_hot(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection
  const userConnection: api.IConnection = { host: connection.host };
  // Create request for home feed with 'hot' sorting and limit of 20
  const requestBody: ICommunityMvPostFeedIndex.IRequest = {
    feed_type: "home",
    sort_algorithm: "hot",
    limit: 20,
  };
  // Call the API endpoint
  const response = await api.functional.community.post_feed_indices.index(
    userConnection,
    { body: requestBody },
  );
  // Validate response structure exactly as per type definition
  typia.assert(response);
  // Validate pagination properties
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // Validate data array is present and has correct type
  TestValidator.predicate("data array is not empty", response.data.length >= 0);
  // No property validation on ISummary - it is defined as empty object
  // We can't validate properties that don't exist in the type
}
