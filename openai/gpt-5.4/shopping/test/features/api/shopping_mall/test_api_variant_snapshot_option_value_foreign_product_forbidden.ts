import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallProductVariantSnapshotOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshotOptionValue";
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

export async function test_api_variant_snapshot_option_value_foreign_product_forbidden(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_seller_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(ownerAuth);
  const ownerProduct =
    await generate_random_shopping_mall_seller_seller_products_create(
      ownerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: 1000,
          status: "active",
        } satisfies IShoppingMallProduct.ICreate,
      },
    );
  typia.assert(ownerProduct);
  TestValidator.equals(
    "owner product belongs to owner seller",
    ownerProduct.seller.id,
    ownerAuth.id,
  );
  const ownerVariant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      ownerConnection,
      {
        params: {
          productId: ownerProduct.id,
        },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: RandomGenerator.paragraph({ sentences: 3 }),
          price: 1000,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(ownerVariant);
  TestValidator.equals(
    "variant belongs to owner product",
    ownerVariant.product.id,
    ownerProduct.id,
  );
  const updatedVariant =
    await api.functional.shoppingMall.seller.seller_products.variants.update(
      ownerConnection,
      {
        productId: ownerProduct.id,
        variantId: ownerVariant.id,
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          option_summary: RandomGenerator.paragraph({ sentences: 4 }),
          price: 2000,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  TestValidator.equals(
    "updated variant id unchanged",
    updatedVariant.id,
    ownerVariant.id,
  );
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuth = await authorize_seller_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(intruderAuth);
  TestValidator.notEquals(
    "intruder is different seller",
    intruderAuth.id,
    ownerAuth.id,
  );
  await TestValidator.httpError(
    "foreign seller cannot inspect variant snapshot option value",
    [403, 404],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.at(
        intruderConnection,
        {
          productId: ownerProduct.id,
          variantId: ownerVariant.id,
          productVariantSnapshotId: typia.random<
            string & tags.Format<"uuid">
          >(),
          optionValueId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
