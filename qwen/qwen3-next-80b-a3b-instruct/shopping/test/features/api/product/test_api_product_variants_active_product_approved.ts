import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariant";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionItem";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variants_active_product_approved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and register
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Create seller connection and register
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Create product with two variants, track expected variants
  const variant1Sku = RandomGenerator.alphaNumeric(8);
  const variant2Sku = RandomGenerator.alphaNumeric(8);
  const variant1Price = (typia.random<number & tags.Minimum<0.01>>() satisfies number as number);
  const variant2Price = (typia.random<number & tags.Minimum<0.01>>() satisfies number as number);
  const basePrice = (typia.random<number & tags.Minimum<0.01>>() satisfies number as number);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: basePrice,
        variants: [
          {
            sku_code: variant1Sku,
            price: variant1Price,
            options: [{ option_name: "Color", option_value: "Red" }],
          } satisfies IShoppingMallProductVariant.ICreate,
          {
            sku_code: variant2Sku,
            price: variant2Price,
            options: [{ option_name: "Color", option_value: "Blue" }],
          } satisfies IShoppingMallProductVariant.ICreate,
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Customer retrieves variants after product creation (seller is auto-approved)
  const variants = await api.functional.shoppingMall.products.variants.at(
    customerConnection,
    {
      productId: product.id,
    },
  );
  typia.assert(variants);
  TestValidator.equals("variants count", variants.data.length, 2);
  // 5. Validate each variant
  const variant1 = variants.data.find((v) => v.sku_code === variant1Sku);
  const variant2 = variants.data.find((v) => v.sku_code === variant2Sku);
  TestValidator.notEquals("variant 1 found", variant1, undefined);
  TestValidator.notEquals("variant 2 found", variant2, undefined);
  TestValidator.equals("variant 1 price", variant1!.price, variant1Price);
  TestValidator.equals("variant 2 price", variant2!.price, variant2Price);
  TestValidator.predicate(
    "variant 1 has non-negative stock",
    () => variant1!.stock_quantity >= 0,
  );
  TestValidator.predicate(
    "variant 2 has non-negative stock",
    () => variant2!.stock_quantity >= 0,
  );
}