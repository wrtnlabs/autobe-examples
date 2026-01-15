import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
export async function test_api_product_variant_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid variantId using UUID format
  const variantId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the product variant by its unique identifier
  const retrievedVariant =
    await api.functional.shoppingMall.product_variants.at(connection, {
      variantId,
    });
  // Validate response type and structure
  typia.assert(retrievedVariant);
  // Verify required fields meet constraints
  TestValidator.predicate("price is non-negative", retrievedVariant.price >= 0);
  TestValidator.predicate(
    "quantity is non-negative",
    retrievedVariant.quantity >= 0,
  );
}
