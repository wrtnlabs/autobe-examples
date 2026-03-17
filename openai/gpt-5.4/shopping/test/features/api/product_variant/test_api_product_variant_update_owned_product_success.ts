import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
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
import { generate_random_shopping_mall_seller_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_create";
import { generate_random_shopping_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_product_variant_update_owned_product_success(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(authorized);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 13500,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(product);
  const initialVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: `${RandomGenerator.name(1)} / ${RandomGenerator.name(1)}`,
          price: 15800,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(initialVariant);
  const updateBody = {
    sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}-UPDATED`,
    option_summary: `${RandomGenerator.name(1)} / ${RandomGenerator.name(1)} / updated`,
    price: null,
  } satisfies IShoppingMallProductVariant.IUpdate;
  const updatedVariant =
    await api.functional.shoppingMall.seller.seller_products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: initialVariant.id,
        body: updateBody,
      },
    );
  typia.assert(updatedVariant);
  TestValidator.equals(
    "seller identity preserved",
    updatedVariant.product.seller.id,
    authorized.id,
  );
  TestValidator.equals("same variant id", updatedVariant.id, initialVariant.id);
  TestValidator.equals(
    "same parent product id",
    updatedVariant.product.id,
    product.id,
  );
  TestValidator.equals(
    "parent product scope preserved from original variant",
    updatedVariant.product.id,
    initialVariant.product.id,
  );
  TestValidator.equals(
    "created_at preserved",
    updatedVariant.created_at,
    initialVariant.created_at,
  );
  TestValidator.equals(
    "deleted_at preserved",
    updatedVariant.deleted_at,
    initialVariant.deleted_at,
  );
  TestValidator.notEquals(
    "updated_at changed",
    updatedVariant.updated_at,
    initialVariant.updated_at,
  );
  TestValidator.equals(
    "sku_code updated",
    updatedVariant.sku_code,
    updateBody.sku_code,
  );
  TestValidator.equals(
    "option_summary updated",
    updatedVariant.option_summary,
    updateBody.option_summary,
  );
  TestValidator.equals(
    "price cleared to inherit product base price",
    updatedVariant.price,
    null,
  );
}
