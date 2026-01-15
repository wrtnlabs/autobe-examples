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
export async function test_api_tag_filtering_by_category(
  connection: api.IConnection,
): Promise<void> {
  // Create a base connection for all operations
  const adminConnection: api.IConnection = { host: connection.host };
  // Define category to test filtering on
  const targetCategory = "Electronics" as const;
  // Filter tags by the target category
  const response = await api.functional.shoppingMall.tags.index(
    adminConnection,
    {
      body: {
        tag_names: [], // Empty array to filter by category, not by tag names
      },
    },
  );
  typia.assert(response);
  // Validate that at least some tags exist
  TestValidator.predicate("tags exist for filtering", response.data.length > 0);
  // Validate that all returned tags belong to the target category
  // Note: We're relying on system having tags in the target category
  for (const tag of response.data) {
    TestValidator.equals(
      "tag category matches target",
      tag.category,
      targetCategory,
    );
  }
  // Validate the sorting by usage_count in descending order
  for (let i = 0; i < response.data.length - 1; i++) {
    TestValidator.predicate(
      "tags sorted by usage_count in descending order",
      response.data[i].usage_count >= response.data[i + 1].usage_count,
    );
  }
  // Verify pagination metadata is correct
  TestValidator.equals("correct current page", response.pagination.current, 1);
  TestValidator.equals("correct limit", response.pagination.limit, 10);
  TestValidator.predicate(
    "correct total records",
    response.pagination.records > 0,
  );
  TestValidator.predicate(
    "correct total pages",
    response.pagination.pages >= 1,
  );
}
