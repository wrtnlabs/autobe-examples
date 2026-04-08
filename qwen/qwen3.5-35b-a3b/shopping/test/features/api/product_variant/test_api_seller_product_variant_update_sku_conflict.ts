import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_seller_product_variant_update_sku_conflict(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(joinResult);
  const sellerTokenConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: joinResult.token.access },
  };
  const categoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerTokenConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const variantA =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerTokenConnection,
      {
        productId: product.id,
        body: {
          sku_code: "SKU-ALPHA",
          option_values: JSON.stringify({ color: "red", size: "L" }),
          stock_quantity: 50,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantA);
  const variantB =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerTokenConnection,
      {
        productId: product.id,
        body: {
          sku_code: "SKU-BETA",
          option_values: JSON.stringify({ color: "blue", size: "M" }),
          stock_quantity: 30,
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variantB);
  await TestValidator.httpError("SKU conflict returns 409", [409], async () => {
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerTokenConnection,
      {
        productId: product.id,
        variantId: variantB.id,
        body: {
          sku_code: "SKU-ALPHA",
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  });
  const updatedVariantB =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerTokenConnection,
      {
        productId: product.id,
        variantId: variantB.id,
        body: {},
      },
    );
  typia.assert(updatedVariantB);
  TestValidator.equals(
    "Variant B SKU unchanged after failed update",
    updatedVariantB.sku_code,
    "SKU-BETA",
  );
  const updatedVariantA =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerTokenConnection,
      {
        productId: product.id,
        variantId: variantA.id,
        body: {},
      },
    );
  typia.assert(updatedVariantA);
  TestValidator.equals(
    "Variant A SKU unchanged after failed update",
    updatedVariantA.sku_code,
    "SKU-ALPHA",
  );
}