import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariantAttribute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantAttribute";
export async function test_api_product_variant_attribute_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate random valid UUIDs for productId and attributeId
  // Since create functions don't exist, we'll test the retrieval endpoint with generated IDs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const attributeId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve the product variant attribute
  const retrievedAttribute =
    await api.functional.shoppingMall.products.variants.attributes.at(
      connection,
      {
        productId: productId,
        attributeId: attributeId,
      },
    );
  // Validate the response structure with typia.assert() which performs full type validation
  typia.assert<IShoppingMallProductVariantAttribute>(retrievedAttribute);
}
