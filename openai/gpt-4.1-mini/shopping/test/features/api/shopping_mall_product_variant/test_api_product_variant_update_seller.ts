import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
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

export async function test_api_product_variant_update_seller(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario 1: Successful update of product variant by authorized seller
  // Setup seller and authenticated connection
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: typia.random<{}>(),
  });
  sellerConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // Create a product and assert it
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  const productWithId = typia.assert(product) as {
    id: string;
  };
  // Create a variant under the product and assert it
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: productWithId.id },
        body: {},
      },
    );
  type VariantType = {
    id: string;
    sku_code: string;
    price_override: number | null;
    stock_quantity: number;
    created_at: string;
    updated_at: string;
  };
  const variantExtended = typia.assert(variant) as VariantType;
  // Prepare update body with correct property names
  const newSkuCode = RandomGenerator.alphaNumeric(10);
  const updateBody: {
    sku_code: string;
    price_override: number | null;
    stock_quantity: number;
  } = {
    sku_code: newSkuCode,
    price_override:
      Math.random() < 0.5 ? null : typia.random<number & tags.Type<"uint32">>(),
    stock_quantity: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<0>
    >(),
  };
  // Perform variant update
  const updatedVariant =
    await api.functional.shoppingMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: productWithId.id,
        variantId: variantExtended.id,
        body: updateBody,
      },
    );
  const updated = typia.assert(updatedVariant) as VariantType;
  // Validate updated values
  TestValidator.equals(
    "updated sku_code",
    updated.sku_code,
    updateBody.sku_code,
  );
  TestValidator.equals(
    "updated stock quantity",
    updated.stock_quantity,
    updateBody.stock_quantity,
  );
  if (updateBody.price_override === null) {
    TestValidator.equals(
      "updated price override is null",
      updated.price_override,
      null,
    );
  } else {
    TestValidator.equals(
      "updated price override",
      updated.price_override,
      updateBody.price_override!,
    );
  }
  // Validate timestamps
  TestValidator.predicate(
    "updated_at is later than or equal to created_at",
    new Date(updated.updated_at).getTime() >=
      new Date(updated.created_at).getTime(),
  );
  // Create another variant to confirm sku_code uniqueness
  const anotherVariant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId: productWithId.id },
        body: {},
      },
    );
  const another = typia.assert(anotherVariant) as VariantType;
  TestValidator.predicate(
    "sku_code uniqueness",
    updated.sku_code !== another.sku_code,
  );
  // Scenario 2: Attempt to update variant with conflicting sku_code - should fail
  const conflictingSkuCode = newSkuCode;
  await TestValidator.error(
    "update with duplicate sku_code should fail",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.update(
        sellerConnection,
        {
          productId: productWithId.id,
          variantId: another.id,
          body: {
            sku_code: conflictingSkuCode,
          },
        },
      );
    },
  );
}
