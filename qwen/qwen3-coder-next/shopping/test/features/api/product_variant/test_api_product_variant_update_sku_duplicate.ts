import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_update_sku_duplicate(
  connection: api.IConnection,
): Promise<void> {
  // 1. Join as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shopName: RandomGenerator.name(3),
      shopDescription: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  
  // 2. Create product with two variants having different SKUs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variant1Id = typia.random<string & tags.Format<"uuid">>();
  
  const variant1 =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: productId,
        variantId: variant1Id,
        body: {
          sku: RandomGenerator.alphaNumeric(8),
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(variant1);
  
  // 3. Try to update variant SKU to duplicate of another variant
  await TestValidator.error("duplicate SKU validation error", async () => {
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: productId,
        variantId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          sku: (variant1 as any).sku, // Using same SKU as existing variant
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  });
}