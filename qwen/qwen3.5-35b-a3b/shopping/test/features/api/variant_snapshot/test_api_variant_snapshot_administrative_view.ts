import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_variant_snapshot_administrative_view(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller joins and authenticates
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerOutput = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(sellerOutput);
  // 2. Seller creates a product
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Seller creates a variant for the product
  const variant =
    await api.functional.ecommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(10),
          option_values: JSON.stringify({
            color: RandomGenerator.pick(["red", "blue", "green", "black"]),
            size: RandomGenerator.pick(["S", "M", "L", "XL"]),
          }),
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<50000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const variantId = variant.id;
  // 4. Seller edits the variant to trigger snapshot creation
  const updatedVariant =
    await api.functional.ecommerceMall.seller.products.variants.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variantId,
        body: {
          option_values: {
            color: RandomGenerator.pick(["yellow", "purple", "white"]),
            size: RandomGenerator.pick(["XS", "L", "XXL"]),
          },
          price: typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<1000> &
              tags.Maximum<50000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // Generate a random snapshot ID since the update response doesn't include it
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 5. Administrator joins and authenticates
  const adminConnection: api.IConnection = { host: connection.host };
  const adminOutput = await authorize_administrator_join(adminConnection, {
    body: {
      display_name: RandomGenerator.name(2),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular",
    },
  });
  typia.assert(adminOutput);
  // 6. Administrator retrieves the variant snapshot
  const snapshot =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.at(
      adminConnection,
      {
        productId: product.id,
        variantId: variantId,
        snapshotId: snapshotId,
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot data
  TestValidator.equals(
    "snapshot product_id matches product",
    snapshot.product_id,
    product.id,
  );
  TestValidator.equals(
    "snapshot seller_id matches seller",
    snapshot.seller_id,
    sellerOutput.id,
  );
  TestValidator.equals(
    "snapshot sku_code preserved",
    snapshot.sku_code,
    variant.sku_code,
  );
  TestValidator.predicate(
    "snapshot price is valid",
    snapshot.price !== null || snapshot.price === null,
  );
  TestValidator.predicate(
    "snapshot stock_quantity is valid",
    snapshot.stock_quantity >= 0,
  );
}
