import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_product_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a UUID for an existing product
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Use admin connection for product retrieval
  const adminConnection: api.IConnection = { host: connection.host };
  // Retrieve the product
  const retrievedProduct = await api.functional.shoppingMall.products.at(
    adminConnection,
    { productId },
  );
  // The IShoppingMallProduct type is {} (empty object) - nothing to validate except that it's not an error
  typia.assert(retrievedProduct);
}
