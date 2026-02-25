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

export async function test_api_product_variants_stock_availability(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customer: any = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Create seller account and login
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller: any = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.IJoin,
  });
  // Ensure seller is logged in with the authorized connection
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: seller.email,
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallSeller.ILogin,
  });
  // 3. Create product with three variants: stock 5, 0, and -1
  // Use IShoppingMallProduct.ICreate but inject stock_quantity via type assertion
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<100>
        >(),
        variants: [
          {
            sku_code: RandomGenerator.alphaNumeric(10),
            price: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<100>
            >(),
            options: [{ option_name: "color", option_value: "red" }],
          } satisfies IShoppingMallProductVariant.ICreate,
          {
            ...typia.assert<IShoppingMallProductVariant.ICreate & { stock_quantity: number }>({ 
              sku_code: RandomGenerator.alphaNumeric(10),
              price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<100>>(),
              options: [{ option_name: "color", option_value: "blue" }],
              stock_quantity: 0 
            }),
          },
          {
            ...typia.assert<IShoppingMallProductVariant.ICreate & { stock_quantity: number }>({ 
              sku_code: RandomGenerator.alphaNumeric(10),
              price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<100>>(),
              options: [{ option_name: "color", option_value: "green" }],
              stock_quantity: -1 
            }),
          },
        ],
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Use customer connection to fetch product variants
  const variantsResponse =
    await api.functional.shoppingMall.products.variants.at(customerConnection, {
      productId: product.id,
    });
  typia.assert(variantsResponse);
  // 5. Validate: Only variants with stock_quantity >= 0 should be returned
  // Expect exactly one variant (variant A with stock: 5) to be returned
  // Variants B (0) and C (-1) should be filtered out
  TestValidator.equals(
    "number of variants returned",
    variantsResponse.data.length,
    1,
  );
  TestValidator.predicate(
    "returned variant has positive stock",
    () => variantsResponse.data[0].stock_quantity > 0,
  );
  TestValidator.notEquals(
    "returned variant is not the one with zero stock",
    variantsResponse.data[0].stock_quantity,
    0,
  );
  TestValidator.notEquals(
    "returned variant is not the one with negative stock",
    variantsResponse.data[0].stock_quantity,
    -1,
  );
  // Ensure that the variant returned has positive stock (>= 1)
  TestValidator.predicate(
    "variant stock is at least 1",
    () => variantsResponse.data[0].stock_quantity >= 1,
  );
}