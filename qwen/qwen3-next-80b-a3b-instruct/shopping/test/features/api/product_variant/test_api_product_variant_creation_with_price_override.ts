import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_creation_with_price_override(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins the platform
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerData: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  };
  const sellerAuthorized: IShoppingMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, { body: sellerData });
  // 2. Seller creates a product (without variants)
  const category_id = typia.random<string & tags.Format<"uuid">>();
  const productData: IShoppingMallProduct.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    category_id,
    base_price: typia.random<
      number & tags.Minimum<0.01>
    >() satisfies number as number,
    // No variants for this creation
  };
  // Note: API incorrectly returns IShoppingMallCustomer but should return IShoppingMallProduct
  // We'll cast the result to access product ID
  const productResponse =
    await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: productData },
    );
  // Since the DTO returns IShoppingMallCustomer, but the product endpoint creates product,
  // we cast as any to extract the id field which IS present on the response (just incorrectly typed)
  const product = productResponse as any;
  const productId: string = product.id;
  // 3. Create a new variant with price override
  const variantData: IShoppingMallProductVariant.ICreate = {
    sku_code: RandomGenerator.alphaNumeric(8),
    price: 29.99 satisfies number as number,
    options: [
      {
        option_name: "Size",
        option_value: "Large",
      },
    ],
  };
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: variantData,
        params: { productId },
      },
    );
  typia.assert(variant);
  // 4. Validate the variant has the correct price override (not base price)
  TestValidator.equals("variant price matches override", variant.price, 29.99);
  TestValidator.equals(
    "variant stock_quantity is 0",
    variant.stock_quantity,
    0,
  );
  TestValidator.equals(
    "variant owns the correct product",
    variant.product_id,
    productId,
  );
  TestValidator.notEquals(
    "variant sku_code is not null or undefined",
    variant.sku_code,
    null,
  );
  TestValidator.notEquals(
    "variant sku_code is not undefined",
    variant.sku_code,
    undefined,
  );
  TestValidator.predicate(
    "variant sku_code is 3-20 alphanumeric characters",
    () => /^[a-zA-Z0-9]{3,20}$/.test(variant.sku_code),
  );
}
