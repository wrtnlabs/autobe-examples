import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_subcategory_retrieval_parent_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate random IDs for non-existent parent and subcategory
  const nonExistentParentId = typia.random<string & tags.Format<"uuid">>();
  const subcategoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve subcategory with invalid parent ID
  await TestValidator.error(
    "should fail when parent category not found",
    async () => {
      await api.functional.shoppingMall.categories.subcategories.at(
        connection,
        {
          categoryId: nonExistentParentId,
          subcategoryId: subcategoryId,
        },
      );
    },
  );
}
