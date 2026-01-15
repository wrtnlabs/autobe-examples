import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
export async function test_api_category_retrieval_by_code(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random category code using typia.random
  const categoryCode: string = typia.random<string>();
  // Call the API endpoint using the generated category code
  const category: IShoppingMallCategory =
    await api.functional.shoppingMall.categories.at(connection, {
      categoryCode,
    });
  // Validate the structure and type of the returned category data
  typia.assert(category);
}
