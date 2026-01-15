import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductPricing } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductPricing";
export async function test_api_product_pricing_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a connection for an unauthenticated request
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate random but valid product ID for pricing retrieval
  const productId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve pricing information for the product
  const pricing: IShoppingMallProductPricing =
    await api.functional.shoppingMall.products.pricing.patchByProductid(
      guestConnection,
      {
        productId: productId,
      },
    );
  // Validate the response structure and constraints
  typia.assert(pricing);
}
