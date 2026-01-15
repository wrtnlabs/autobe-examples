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
export async function test_api_tag_filtering_by_name(
  connection: api.IConnection,
): Promise<void> {
  // Create connection for test
  const connectionForTest: api.IConnection = { host: connection.host };
  // We cannot create tags as the API doesn't provide a creation endpoint
  // The only available endpoint is PATCH /shoppingMall/tags for filtering
  // We must test filtering behavior assuming tags already exist in the system
  // We'll use a tag name that likely exists in the system
  const tagName = "Eco-Friendly";
  // Test filtering by exact match
  const filterBody: IShoppingMallProductTag.IRequest = {
    tag_names: [tagName],
  } satisfies IShoppingMallProductTag.IRequest;
  // Perform the filter operation
  const result = await api.functional.shoppingMall.tags.index(
    connectionForTest,
    {
      body: filterBody,
    },
  );
  typia.assert(result);
  // Validate the response structure
  TestValidator.equals(
    "result should contain some tag",
    result.data.length > 0,
    true,
  );
  // Validate that at least one tag matches the requested name
  const matchingTags = result.data.filter((tag) => tag.name === tagName);
  TestValidator.equals(
    "at least one tag matches exact name",
    matchingTags.length > 0,
    true,
  );
  // Validate pagination data
  TestValidator.equals(
    "pagination current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    result.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination records should be positive",
    result.pagination.records > 0,
    true,
  );
  TestValidator.equals(
    "pagination pages should be at least 1",
    result.pagination.pages >= 1,
    true,
  );
  // Validate case sensitivity
  // Send the same tag name in lowercase (should NOT match)
  const lowercaseBody: IShoppingMallProductTag.IRequest = {
    tag_names: [tagName.toLowerCase()],
  } satisfies IShoppingMallProductTag.IRequest;
  const lowercaseResult = await api.functional.shoppingMall.tags.index(
    connectionForTest,
    {
      body: lowercaseBody,
    },
  );
  typia.assert(lowercaseResult);
  // Verify that lowercase filter returns no results (case sensitive)
  TestValidator.equals(
    "lowercase query should return 0 tags",
    lowercaseResult.data.length,
    0,
  );
  // Validate that inactive tags are filtered out
  // We have no way to create an inactive tag, but we can verify the filtering behavior
  // If we get a tag with is_active: false, it would be a failure
  // Since we need to test proper behavior, we'll validate that all returned tags are active
  const allActive = result.data.every((tag) => tag.is_active === true);
  TestValidator.predicate("all returned tags should be active", allActive);
}
