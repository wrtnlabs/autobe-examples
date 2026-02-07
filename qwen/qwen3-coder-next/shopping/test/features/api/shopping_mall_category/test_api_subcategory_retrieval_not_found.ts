import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_subcategory_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate unique IDs for non-existent subcategory
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  const subcategoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent subcategory - should fail with 404
  await TestValidator.error("subcategory not found", async () => {
    await api.functional.shoppingMall.categories.subcategories.at(connection, {
      categoryId,
      subcategoryId,
    });
  });
}
