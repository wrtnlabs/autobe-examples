import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving a paginated list of community platform users with empty body.
 * This test validates the pagination metadata correctness and the structure of the data array.
 * Since request and summary DTOs have no filtering properties, filtering and sorting cannot be tested directly.
 * The focus is on ensuring the API returns a well-formed paginated user summary response.
 */
export async function test_api_community_platform_users_search_username_sort_karma_desc(
  connection: api.IConnection,
): Promise<void> {
  // request body is empty as per ICommunityPlatformUser.IRequest definition
  const body = {} satisfies ICommunityPlatformUser.IRequest;
  // call the API endpoint
  const output = await api.functional.communityPlatform.users.index(
    connection,
    { body },
  );
  // assert full response type correctness
  typia.assert(output);
  // validate pagination fields
  const pagination = output.pagination;
  TestValidator.predicate("pagination limit positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination current page positive",
    pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    pagination.records >= 0,
  );
  // validate data array existence and type
  const data = output.data;
  TestValidator.predicate("data is array", Array.isArray(data));
  // validate each item is valid ICommunityPlatformUser.ISummary
  for (const item of data) {
    typia.assert(item);
  }
  // validate data length does not exceed limit
  TestValidator.predicate(
    "data length within limit",
    data.length <= pagination.limit,
  );
}
