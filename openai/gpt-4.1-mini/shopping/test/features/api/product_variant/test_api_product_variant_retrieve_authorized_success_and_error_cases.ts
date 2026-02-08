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

export async function test_api_product_variant_retrieve_authorized_success_and_error_cases(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successfully retrieve an existing product variant detail as the authorized seller who owns the product.
  // 1-1. Authenticate as seller by joining
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: typia.random<IShoppingMallSeller.IJoin>(),
  });
  typia.assert(sellerAuthorized);
  // Update connection with seller token
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: `Bearer ${sellerAuthorized.token.access}`,
  };
  // 1-2. Create a product owned by the seller
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    { body: undefined },
  );
  typia.assert(product);
  const productId =
    (product as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 1-3. Create a product variant under the created product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      sellerConnection,
      {
        params: { productId },
        body: undefined,
      },
    );
  typia.assert(variant);
  const variantId =
    (variant as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 1-4. Retrieve the product variant by specifying correct productId and variantId
  const retrievedVariant =
    await api.functional.shoppingMall.seller.products.variants.at(
      sellerConnection,
      {
        productId,
        variantId,
      },
    );
  typia.assert(retrievedVariant);
  // Since DTO properties are not defined, comprehensive property assertions are omitted
  // Scenario 2: Attempt to retrieve a product variant where the variant does not belong to the product.
  // 2-1. Authenticate as seller by joining
  const otherSellerJoinConnection: api.IConnection = { host: connection.host };
  const otherSellerAuthorized = await authorize_seller_join(
    otherSellerJoinConnection,
    {
      body: typia.random<IShoppingMallSeller.IJoin>(),
    },
  );
  typia.assert(otherSellerAuthorized);
  // Update connection with other seller token
  const otherSellerConnection: api.IConnection = { host: connection.host };
  otherSellerConnection.headers = {
    Authorization: `Bearer ${otherSellerAuthorized.token.access}`,
  };
  // 2-2. Create two different products
  const firstProduct =
    await generate_random_shopping_mall_seller_products_create(
      otherSellerConnection,
      { body: undefined },
    );
  typia.assert(firstProduct);
  const firstProductId =
    (firstProduct as any).id ?? typia.random<string & tags.Format<"uuid">>();
  const secondProduct =
    await generate_random_shopping_mall_seller_products_create(
      otherSellerConnection,
      { body: undefined },
    );
  typia.assert(secondProduct);
  const secondProductId =
    (secondProduct as any).id ?? typia.random<string & tags.Format<"uuid">>();
  // 2-3. Create a product variant under the second product
  const secondProductVariant =
    await generate_random_shopping_mall_seller_products_variants_create_variant(
      otherSellerConnection,
      {
        params: { productId: secondProductId },
        body: undefined,
      },
    );
  typia.assert(secondProductVariant);
  const secondProductVariantId =
    (secondProductVariant as any).id ??
    typia.random<string & tags.Format<"uuid">>();
  // 2-4. Attempt to retrieve the variant with the first productId and variantId of second product variant
  await TestValidator.error(
    "variant does not belong to the specified product",
    async () => {
      await api.functional.shoppingMall.seller.products.variants.at(
        otherSellerConnection,
        {
          productId: firstProductId,
          variantId: secondProductVariantId,
        },
      );
    },
  );
  // Scenario 3: Attempt to retrieve a product variant as an unauthorized user (without authentication).
  // 3-1. Attempt to retrieve the product variant without authentication
  await TestValidator.httpError(
    "unauthorized access without token",
    401,
    async () => {
      await api.functional.shoppingMall.seller.products.variants.at(
        { host: connection.host },
        {
          productId,
          variantId,
        },
      );
    },
  );
}
