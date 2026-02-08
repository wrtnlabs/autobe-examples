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

export async function test_api_product_variant_creation_unique_stock_quantity(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful creation of a new product variant with unique SKU
  {
    // Authenticate as a new seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
      body: {},
    });
    typia.assert(sellerAuth);
    sellerConnection.headers = {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    };
    // Create a new product
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: {} },
    );
    typia.assert(product);
    // Create a product variant with unique SKU
    const skuUnique = `sku-${RandomGenerator.alphaNumeric(10)}`;
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create_variant(
        sellerConnection,
        {
          params: { productId: "" },
          body: {
            sku_code: skuUnique,
            price_override: null,
            stock_quantity: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<0>
            >(),
          },
        },
      );
    typia.assert(variant);
    // Check fields per allowed properties
    TestValidator.predicate(
      "variant sku_code type",
      typeof (variant as any).sku_code === "string",
    );
    TestValidator.predicate(
      "price_override nullable type",
      (variant as any).price_override === null || typeof (variant as any).price_override === "number",
    );
    TestValidator.predicate(
      "stock_quantity type number",
      typeof (variant as any).stock_quantity === "number",
    );
  }
  // Scenario 2: Creating a product variant with zero stock quantity
  {
    // Authenticate as a new seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
      body: {},
    });
    typia.assert(sellerAuth);
    sellerConnection.headers = {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    };
    // Create a new product
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: {} },
    );
    typia.assert(product);
    // Create a product variant with zero stock quantity
    const skuZero = `sku-${RandomGenerator.alphaNumeric(10)}`;
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create_variant(
        sellerConnection,
        {
          params: { productId: "" },
          body: {
            sku_code: skuZero,
            price_override: null,
            stock_quantity: 0,
          },
        },
      );
    typia.assert(variant);
    TestValidator.predicate(
      "variant stock_quantity type",
      typeof (variant as any).stock_quantity === "number",
    );
  }
  // Scenario 3: Attempt to create a product variant with duplicate SKU code
  {
    // Authenticate as a new seller
    const sellerConnection: api.IConnection = { host: connection.host };
    const sellerAuth = await authorize_seller_join(sellerConnection, {
      body: {},
    });
    typia.assert(sellerAuth);
    sellerConnection.headers = {
      Authorization: `Bearer ${sellerAuth.token.access}`,
    };
    // Create a new product
    const product = await generate_random_shopping_mall_seller_products_create(
      sellerConnection,
      { body: {} },
    );
    typia.assert(product);
    // Create a product variant with SKU
    const skuDup = `sku-${RandomGenerator.alphaNumeric(10)}`;
    const variant =
      await generate_random_shopping_mall_seller_products_variants_create_variant(
        sellerConnection,
        {
          params: { productId: "" },
          body: {
            sku_code: skuDup,
            price_override: null,
            stock_quantity: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<0>
            >(),
          },
        },
      );
    typia.assert(variant);
    await TestValidator.error("duplicate SKU code error", async () => {
      await generate_random_shopping_mall_seller_products_variants_create_variant(
        sellerConnection,
        {
          params: { productId: "" },
          body: {
            sku_code: skuDup,
            price_override: null,
            stock_quantity: typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<0>
            >(),
          },
        },
      );
    });
  }
}
