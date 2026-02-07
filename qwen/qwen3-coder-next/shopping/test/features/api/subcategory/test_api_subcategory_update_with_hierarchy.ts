import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_subcategory_update_with_hierarchy(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  // Test the updateSubcategory API with minimal valid parameters
  // Using empty object {} as the update body since IShoppingMallSubcategory.IUpdate is empty
  const updatedSubcategory =
    await api.functional.shoppingMall.categories.subcategories.updateSubcategory(
      adminConnection,
      {
        categoryId: typia.random<string & tags.Format<"uuid">>(),
        body: {} satisfies IShoppingMallSubcategory.IUpdate,
      },
    );
  typia.assert(updatedSubcategory);
  // Validate that the response matches the expected type
  TestValidator.predicate(
    "response is valid subcategory",
    updatedSubcategory !== null && updatedSubcategory !== undefined,
  );
}
