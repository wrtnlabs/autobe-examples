import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create_variant } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create_variant";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_update_unauthorized_access(
  connection: api.IConnection,
): Promise<void> {
  // Test unauthorized update of a product variant
  // 1. Seller A joins and is authorized
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerA_password",
      shopName: RandomGenerator.name(),
    },
  });
  // Update connection headers for Seller A
  sellerAConnection.headers = { Authorization: sellerA.token.access };
  // 2. Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {
      body: {
        base_price: 1000,
        description: RandomGenerator.paragraph({ sentences: 3 }),
        name: RandomGenerator.name(2),
      },
    },
  );
  typia.assert(product);
  // 3. Seller A creates a product variant under the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerAConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          priceOverride: 1200,
          stockQuantity: 10,
        },
      },
    );
  typia.assert(variant);
  // 4. Seller B joins and is authorized
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerB_password",
      shopName: RandomGenerator.name(),
    },
  });
  // Update connection headers for Seller B
  sellerBConnection.headers = { Authorization: sellerB.token.access };
  // 5. Seller B attempts to update Seller A's product variant
  const updateBody: IShoppingMallProductVariant.IUpdate = {
    skuCode: variant.skuCode, // keep same skuCode
    priceOverride: variant.priceOverride ? variant.priceOverride + 100 : 1300,
    stockQuantity: variant.stockQuantity + 5,
  };
  // 6. Validate that update is rejected due to unauthorized access
  await TestValidator.error(
    "Unauthorized update must be rejected",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.updateVariant(
        sellerBConnection,
        {
          productId: product.id,
          variantId: variant.id,
          body: updateBody,
        },
      );
    },
  );
}
