import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_subcategory_update_empty_request(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random parent category ID for testing
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // Update with empty object - DTO types are empty so no properties to update
  const result =
    await api.functional.shoppingMall.categories.subcategories.updateSubcategory(
      connection,
      {
        categoryId: categoryId,
        body: {} satisfies IShoppingMallSubcategory.IUpdate,
      },
    );
  // Validate that the response conforms to the IShoppingMallSubcategory type
  typia.assert(result);
}
