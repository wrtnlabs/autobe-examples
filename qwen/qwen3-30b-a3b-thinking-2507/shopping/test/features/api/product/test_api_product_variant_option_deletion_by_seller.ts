import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
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
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_product_variant_option_deletion_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  // 2. Create a new product
  const product = await api.functional.shoppingMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
        price: 10000,
        category_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // Ensure product has an id
  const safeProduct = typia.assert<
    IShoppingMallProduct & {
      id: string;
    }
  >(product);
  // 3. Add a variant to the product
  const variant =
    await api.functional.shoppingMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: safeProduct.id,
        body: {
          sku:
            "SKU-" +
            ArrayUtil.repeat(5, () =>
              RandomGenerator.pick("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split('')),
            ).join(""),
          options: {
            color: RandomGenerator.pick(["red", "blue", "green", "yellow"]),
            size: RandomGenerator.pick(["S", "M", "L", "XL"]),
          },
          price: 12000,
          stockQuantity: 100,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Ensure variant has an id
  const safeVariant = typia.assert<
    IShoppingMallProductVariant & {
      id: string;
    }
  >(variant);
  // 4. Add an option to the variant
  const option =
    await api.functional.shoppingMall.seller.products.variants.options.create(
      sellerConnection,
      {
        productId: safeProduct.id,
        variantId: safeVariant.id,
        body: {} satisfies IShoppingMallProductVariantOption.ICreate,
      },
    );
  typia.assert(option);
  // Ensure option has an id
  const safeOption = typia.assert<
    IShoppingMallProductVariantOption & {
      id: string;
    }
  >(option);
  // 5. Delete the option
  await api.functional.shoppingMall.seller.products.variants.options.erase(
    sellerConnection,
    {
      productId: safeProduct.id,
      variantId: safeVariant.id,
      optionId: safeOption.id,
    },
  );
}