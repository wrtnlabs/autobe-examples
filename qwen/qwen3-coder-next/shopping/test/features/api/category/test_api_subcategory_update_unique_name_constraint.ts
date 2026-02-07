import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_subcategory_update_unique_name_constraint(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for testing
  const adminConnection: api.IConnection = { host: connection.host };
  // Test unique constraint validation for subcategory updates
  // This test verifies that updating a subcategory to have the same name as
  // another subcategory within the same parent category is properly rejected
  // Generate test data
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const subcategory1Id = typia.random<string & tags.Format<"uuid">>();
  const subcategory2Id = typia.random<string & tags.Format<"uuid">>();
  // Simulate existing subcategories for testing
  const subcategory1Name = "Electronics";
  const subcategory2Name = "Clothing";
  // Test 1: Attempt to update subcategory2 to duplicate name (should fail)
  await TestValidator.error("duplicate name within same parent", async () => {
    await api.functional.shoppingMall.categories.subcategories.updateSubcategory(
      adminConnection,
      {
        categoryId,
        body: {
          id: subcategory2Id,
          name: subcategory1Name, // Duplicate name - should violate unique constraint
          description: "Updated description",
        } satisfies IShoppingMallSubcategory.IUpdate,
      },
    );
  });
  // Test 2: Update subcategory2 to unique name (should succeed)
  const updatedSubcategory =
    await api.functional.shoppingMall.categories.subcategories.updateSubcategory(
      adminConnection,
      {
        categoryId,
        body: {
          id: subcategory2Id,
          name: "Sports Equipment",
          description: "Updated description",
        } satisfies IShoppingMallSubcategory.IUpdate,
      },
    );
  typia.assert(updatedSubcategory);
  // Test 3: Verify same name works in different parent category
  const categoryId2 = typia.random<string & tags.Format<"uuid">>();
  const subcategory3 =
    await api.functional.shoppingMall.categories.subcategories.updateSubcategory(
      adminConnection,
      {
        categoryId: categoryId2,
        body: {
          id: typia.random<string & tags.Format<"uuid">>(),
          name: subcategory1Name, // Same name as subcategory1 but different parent
          description: "Description in different category",
        } satisfies IShoppingMallSubcategory.IUpdate,
      },
    );
  typia.assert(subcategory3);
}
