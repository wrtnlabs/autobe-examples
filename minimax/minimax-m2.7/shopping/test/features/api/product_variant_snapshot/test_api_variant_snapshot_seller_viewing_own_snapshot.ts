import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshotVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariant";
import type { IEcommerceMallProductSnapshotVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshotVariantOptionValue";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
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
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

export async function test_api_variant_snapshot_seller_viewing_own_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create a product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        base_price: typia.random<number & tags.Minimum<1000>>() satisfies number as number,
        category_id: typia.random<string & tags.Format<"uuid">>(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        name: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(product);
  // 3. Create a product variant with specific option values
  const variantSku = `SKU-${RandomGenerator.alphaNumeric(8)}`;
  const variantPrice = typia.random<number & tags.Minimum<0>>();
  const variantQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      sellerConnection,
      {
        params: {
          productId: product.id,
        },
        body: {
          sku_code: variantSku,
          price: variantPrice satisfies number | null,
          quantity: variantQuantity,
          option_values: [
            {
              key: "color",
              value: "Red",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
            {
              key: "size",
              value: "Large",
            } satisfies IEcommerceMallProductVariantOptionValue.ICreate,
          ],
        },
      },
    );
  typia.assert(variant);
  // 4. View variant snapshot
  // The snapshot endpoint returns immutable historical variant state
  const snapshot =
    await api.functional.ecommerceMall.seller.products.variants.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        snapshotId: variant.id,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot contains expected data
  TestValidator.equals("snapshot has valid id", snapshot.id.length > 0, true);
  TestValidator.equals(
    "snapshot sku matches variant",
    snapshot.sku,
    variantSku,
  );
  TestValidator.equals(
    "snapshot price_override matches",
    snapshot.price_override,
    variantPrice,
  );
  TestValidator.equals(
    "snapshot stock_quantity matches",
    snapshot.stock_quantity,
    variantQuantity,
  );
  TestValidator.equals(
    "snapshot has optionValues",
    Array.isArray(snapshot.optionValues),
    true,
  );
  TestValidator.equals(
    "snapshot has created_at",
    typeof snapshot.created_at === "string",
    true,
  );
}