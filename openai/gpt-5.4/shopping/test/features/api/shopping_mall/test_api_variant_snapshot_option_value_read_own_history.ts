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

export async function test_api_variant_snapshot_option_value_read_own_history(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(seller);
  const product =
    await generate_random_shopping_mall_seller_seller_products_create(
      sellerConnection,
      {
        body: {
          shopping_mall_category_id: null,
          name: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >() satisfies number as number,
          status: "sale",
        },
      },
    );
  typia.assert(product);
  const initialSku = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const initialOptionSummary = `Color ${RandomGenerator.alphabets(4)} / Size ${RandomGenerator.alphabets(3)}`;
  const initialPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >() satisfies number as number;
  const variant =
    await generate_random_shopping_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: initialSku,
          option_summary: initialOptionSummary,
          price: initialPrice,
        },
      },
    );
  typia.assert(variant);
  const updatedSku = `sku-${RandomGenerator.alphaNumeric(8)}`;
  const updatedOptionSummary = `Color ${RandomGenerator.alphabets(4)} / Size ${RandomGenerator.alphabets(3)}`;
  const updatedPrice = typia.random<
    number & tags.Type<"uint32"> & tags.Minimum<1000>
  >() satisfies number as number;
  const updatedVariant =
    await api.functional.shoppingMall.seller.seller_products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          sku_code: updatedSku,
          option_summary: updatedOptionSummary,
          price: updatedPrice,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  TestValidator.equals(
    "variant id is preserved after update",
    updatedVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "variant sku updated to live state",
    updatedVariant.sku_code,
    updatedSku,
  );
  TestValidator.equals(
    "variant option summary updated to live state",
    updatedVariant.option_summary,
    updatedOptionSummary,
  );
  TestValidator.equals(
    "variant price updated to live state",
    updatedVariant.price,
    updatedPrice,
  );
  TestValidator.notEquals(
    "variant sku differs from historical seed",
    updatedVariant.sku_code,
    initialSku,
  );
  TestValidator.notEquals(
    "variant option summary differs from historical seed",
    updatedVariant.option_summary,
    initialOptionSummary,
  );
  TestValidator.notEquals(
    "variant price differs from historical seed",
    updatedVariant.price,
    initialPrice,
  );
  await TestValidator.httpError(
    "snapshot option value detail requires an existing snapshot and option-value chain under owned resources",
    [404, 403],
    async () => {
      await api.functional.shoppingMall.seller.seller_products.variants.snapshots.option_values.at(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          productVariantSnapshotId: typia.random<
            string & tags.Format<"uuid">
          >(),
          optionValueId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
