import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random product using the SDK's built-in random method
  const product = typia.random<IShoppingMallProduct>();
  typia.assert(product);
  // Retrieve product detail
  const retrievedProduct = await api.functional.shoppingMall.products.at(
    connection,
    {
      productId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  typia.assert(retrievedProduct);
}
