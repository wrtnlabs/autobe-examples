import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_category_details_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID that doesn't exist in the database
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the non-existent category
  await TestValidator.error(
    "should return 404 for non-existent category",
    async () => {
      await api.functional.shoppingMall.categories.at(connection, {
        categoryId: nonExistentCategoryId,
      });
    },
  );
}
