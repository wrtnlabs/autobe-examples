import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_product_variant_update_sku_uniqueness_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const seller = await authorize_seller_join(sellerConnection, {
    body: sellerCredentials,
  });
  typia.assert(seller);
  // 2. Create seller product
  const product =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: typia.random<string>(),
        variantId: typia.random<string>(),
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          price_override: typia.random<number & tags.Type<"uint32">>(),
        },
      },
    );
  typia.assert(product);
  // 3. Create second variant with unique SKU
  const secondVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.shoppingMallProductId,
        variantId: typia.random<string>(),
        body: {
          sku_code: RandomGenerator.alphaNumeric(8),
          price_override: typia.random<number & tags.Type<"uint32">>(),
        },
      },
    );
  typia.assert(secondVariant);
  // 4. Attempt to update second variant with first variant's SKU (should fail)
  await TestValidator.error("SKU uniqueness violation", async () => {
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.shoppingMallProductId,
        variantId: secondVariant.id,
        body: {
          sku_code: product.skuCode,
          price_override: secondVariant.priceOverride,
        },
      },
    );
  });
}
