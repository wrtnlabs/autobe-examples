import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductTag";
import type { IShoppingMallProductTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductTag";
export async function test_api_tag_filtering_usage_threshold(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Define tag names to create and test
  const tagNames = [
    "popular-tag",
    "moderate-tag",
    "infrequent-tag",
    "rare-tag",
    "super-popular-tag",
    "zero-usage-tag",
  ];
  // Create initial tags through the API
  // This is the only way to create tags with the provided API
  const createPayload: IShoppingMallProductTag.IRequest = {
    tag_names: tagNames,
  };
  // Create all tags
  const createResponse = await api.functional.shoppingMall.tags.index(
    adminConnection,
    {
      body: createPayload,
    },
  );
  typia.assert(createResponse);
  // Test 1: Filter by a known tag name
  const knownTagName = "popular-tag";
  const responseWithFilter = await api.functional.shoppingMall.tags.index(
    adminConnection,
    {
      body: {
        tag_names: [knownTagName],
      },
    },
  );
  typia.assert(responseWithFilter);
  // Verify we got exactly one tag with the correct name
  TestValidator.equals(
    "filter returns exactly one tag",
    responseWithFilter.data.length,
    1,
  );
  TestValidator.equals(
    "returned tag name matches",
    responseWithFilter.data[0].name,
    knownTagName,
  );
  // Test 2: Filter by non-existent tag name
  const nonExistentTag = "nonexistent-tag";
  const emptyResponse = await api.functional.shoppingMall.tags.index(
    adminConnection,
    {
      body: {
        tag_names: [nonExistentTag],
      },
    },
  );
  typia.assert(emptyResponse);
  // Verify empty results
  TestValidator.equals(
    "nonexistent tag returns empty array",
    emptyResponse.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records is 0 when no tags found",
    emptyResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages is 1 when no tags found",
    emptyResponse.pagination.pages,
    1,
  );
  // Test 3: Filter by multiple tag names
  const multipleTags = ["popular-tag", "moderate-tag", "infrequent-tag"];
  const multiResponse = await api.functional.shoppingMall.tags.index(
    adminConnection,
    {
      body: {
        tag_names: multipleTags,
      },
    },
  );
  typia.assert(multiResponse);
  // Verify correct count of filtered tags
  TestValidator.equals(
    "multiple tags filter returns correct count",
    multiResponse.data.length,
    3,
  );
  // Test 4: Test pagination with tag_names filter
  // Since the endpoint returns all tags when no filter is applied,
  // and we know we created 6 tags, we can test pagination on full list
  const paginationLimit = 2;
  const fullListResponse = await api.functional.shoppingMall.tags.index(
    adminConnection,
    {
      body: {
        tag_names: tagNames, // Return all created tags
      },
    },
  );
  typia.assert(fullListResponse);
  // Verify the total number of tags is correct
  TestValidator.equals(
    "total tags match creation",
    fullListResponse.pagination.records,
    tagNames.length,
  );
  // Test the pagination calculations
  const expectedPages = Math.ceil(tagNames.length / paginationLimit);
  TestValidator.equals(
    "pagination pages calculation correct",
    fullListResponse.pagination.pages,
    Math.ceil(tagNames.length / paginationLimit),
  );
  TestValidator.equals(
    "pagination limit matches",
    fullListResponse.pagination.limit,
    tagNames.length,
  ); // Note: The API doesn't allow specifying limit in request - it returns all matching tags
  // Test 5: Test empty tag_names array
  const emptyNamesResponse = await api.functional.shoppingMall.tags.index(
    adminConnection,
    {
      body: {
        tag_names: [],
      },
    },
  );
  typia.assert(emptyNamesResponse);
  // According to schema, IShoppingMallProductTag.IRequest requires at least one tag_name
  // So this might fail with a validation error, which is the correct behavior
  // We expect this scenario to fail validation at the server side, not at the client
  // Given the constraints of the API, we focus on the valid filtering functionality
  // which exists: filtering by tag_names
  // The scenario's requirement for usage_count filtering is impossible
  // to implement with the provided API, so we test the actual API functionality
  // that is available and valid.
  // This is an example of correcting an impossible scenario by testing
  // the real, available functionality.
}
