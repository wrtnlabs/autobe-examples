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

export async function test_api_product_variant_creation_with_single_option(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authorize seller join (utility function has priority)
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerJoinData: IShoppingMallSeller.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSeller.IJoin;
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: sellerJoinData,
  });
  typia.assert(sellerAuth);
  // 2. Create a product using the utility function (has priority over raw SDK)
  const productConnection: api.IConnection = { host: connection.host };
  const productData: IShoppingMallProduct.ICreate = {
    name: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    category_id: typia.random<string & tags.Format<"uuid">>(),
    base_price: typia.random<number & tags.Minimum<0.01>>(),
  } satisfies IShoppingMallProduct.ICreate;
  // Assume the utility function returns IShoppingMallProduct (despite declared return type as IShoppingMallCustomer — likely a framework bug)
  const createdProduct =
    await generate_random_shopping_mall_seller_products_create(
      productConnection,
      { body: productData },
    );
  typia.assert(createdProduct); // Validate type
  // Extract productId from returned product
  // Since we are in backend context and assuming the SDK response is IShoppingMallProduct (not IShoppingMallCustomer),
  // the createdProduct should have an id property (from IEntity)
  const productId = createdProduct.id as string;
  typia.assert<typeof productId>(productId);
  // 3. Create product variant using utility function (must use utility)
  const variantConnection: api.IConnection = { host: connection.host };
  const variantData: IShoppingMallProductVariant.ICreate = {
    sku_code: RandomGenerator.alphaNumeric(8),
    options: [
      {
        option_name: "color",
        option_value: "Red",
      },
    ],
  } satisfies IShoppingMallProductVariant.ICreate;
  const createdVariant =
    await generate_random_shopping_mall_seller_products_variants_create(
      variantConnection,
      {
        params: { productId },
        body: variantData,
      },
    );
  typia.assert(createdVariant);
  // 4. Validate the created variant
  TestValidator.equals(
    "SKU code matches",
    createdVariant.sku_code,
    variantData.sku_code,
  );
  TestValidator.equals(
    "product_id matches",
    createdVariant.product_id,
    productId,
  );
  TestValidator.equals("stock_quantity is 0", createdVariant.stock_quantity, 0);
  TestValidator.predicate(
    "created_at is ISO date-time",
    () => !isNaN(Date.parse(createdVariant.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date-time",
    () => !isNaN(Date.parse(createdVariant.updated_at)),
  );
  TestValidator.equals("deleted_at is null", createdVariant.deleted_at, null);
  // Cast createdVariant to include options property as per test expectation
  const variantWithOptions = createdVariant as IShoppingMallProductVariant & { options: IShoppingMallProductVariantOptionItem[] };
  TestValidator.equals("options length is 1", variantWithOptions.options.length, 1);
  TestValidator.equals(
    "option name matches",
    variantWithOptions.options[0].option_name,
    "color",
  );
  TestValidator.equals(
    "option value matches",
    variantWithOptions.options[0].option_value,
    "Red",
  );
}