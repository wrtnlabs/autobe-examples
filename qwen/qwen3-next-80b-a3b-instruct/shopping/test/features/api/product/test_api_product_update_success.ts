import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_update_success(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  // Since IShoppingMallProduct has no properties, we cannot extract an ID from the created product
  // We must generate a UUID to use for the update call
  const productId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Generate updated product details
  const newProductName = RandomGenerator.paragraph({ sentences: 2 });
  const newProductDescription = RandomGenerator.content({ paragraphs: 3 });
  const newBasePrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1>
  >();
  // Call update operation with generated UUID
  const updatedProductRaw =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId,
      body: {
        name: newProductName,
        description: newProductDescription,
        base_price: newBasePrice,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  // Assert the response is a valid product (even though schema is empty)
  const updatedProduct = typia.assert<IShoppingMallProduct>(updatedProductRaw);
  // Validate the update operation succeeded
  TestValidator.predicate(
    "product update successful, returned product",
    () => updatedProduct != null,
  );
}
