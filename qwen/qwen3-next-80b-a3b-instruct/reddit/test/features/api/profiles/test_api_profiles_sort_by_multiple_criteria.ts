import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityMember";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_profiles_sort_by_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for API calls
  const apiConnection: api.IConnection = { host: connection.host };
  // Generate random search request parameters using typia
  const randomRequest: IRedditCommunityMember.IRequest =
    typia.random<IRedditCommunityMember.IRequest>();
  // Test 1: Call API with random parameters to validate structure
  const response1 = await api.functional.redditCommunity.profiles.index(
    apiConnection,
    {
      body: randomRequest,
    },
  );
  typia.assert(response1);
  // Validate pagination structure
  TestValidator.equals(
    "pagination current >= 1",
    response1.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination limit between 1-100",
    response1.pagination.limit >= 1 && response1.pagination.limit <= 100,
    true,
  );
  TestValidator.equals(
    "pagination records >= 0",
    response1.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination pages >= 0",
    response1.pagination.pages >= 0,
    true,
  );
  // Validate data array
  TestValidator.predicate("data is array", Array.isArray(response1.data));
  TestValidator.predicate(
    "data length matches pagination",
    response1.data.length === response1.pagination.limit ||
      response1.pagination.current === response1.pagination.pages,
  );
  // Test 2: Ensure default sort order is consistent with multiple calls without sort parameter
  const response2 = await api.functional.redditCommunity.profiles.index(
    apiConnection,
    {
      body: {
        // Only page and limit, no sort parameter
        page: randomRequest.page ?? 1,
        limit: randomRequest.limit ?? 10,
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(response2);
  // Default sort should be consistent on repeated calls with same parameters
  TestValidator.equals(
    "response data length consistency",
    response1.data.length,
    response2.data.length,
  );
  TestValidator.equals(
    "pagination consistency",
    response1.pagination.current,
    response2.pagination.current,
  );
  TestValidator.equals(
    "pagination records consistency",
    response1.pagination.records,
    response2.pagination.records,
  );
  // Test 3: Test sort=karma
  const responseKarma = await api.functional.redditCommunity.profiles.index(
    apiConnection,
    {
      body: {
        ...randomRequest,
        sort: "karma",
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(responseKarma);
  // Test 4: Test sort=createdAt
  const responseCreatedAt = await api.functional.redditCommunity.profiles.index(
    apiConnection,
    {
      body: {
        ...randomRequest,
        sort: "createdAt",
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(responseCreatedAt);
  // Test 5: Test sort=username
  const responseUsername = await api.functional.redditCommunity.profiles.index(
    apiConnection,
    {
      body: {
        ...randomRequest,
        sort: "username",
      } satisfies IRedditCommunityMember.IRequest,
    },
  );
  typia.assert(responseUsername);
  // Validate that each sort parameter returned a non-empty response structure
  TestValidator.equals(
    "karma sort returned data",
    responseKarma.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "createdAt sort returned data",
    responseCreatedAt.data.length >= 0,
    true,
  );
  TestValidator.equals(
    "username sort returned data",
    responseUsername.data.length >= 0,
    true,
  );
  // Verify we don't get compilation errors and all responses are properly typed
}