import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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

export async function test_api_variant_options_update_and_remove(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication - join platform
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product with seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 3. Create variant with initial options
  const initialOptions = {
    color: "Red",
    size: "Large",
    material: "Cotton",
  } as const;
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          sku: RandomGenerator.alphaNumeric(8),
          options: initialOptions,
          base_price: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 4. Batch update request - update color and remove material
  const updateOptions =
    await api.functional.ecommerceMall.seller.products.variants.options.updateOptions(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          operations: [
            {
              action: "update",
              key: "color",
              value: "Blue",
            },
            {
              action: "remove",
              key: "material",
            },
          ],
        },
      },
    );
  typia.assert(updateOptions);
  // 5. Validate updated options
  TestValidator.equals(
    "option update - color changed to Blue",
    updateOptions.options.color,
    "Blue",
  );
  TestValidator.equals(
    "option update - size unchanged",
    updateOptions.options.size,
    "Large",
  );
  TestValidator.equals(
    "option remove - material should be undefined",
    updateOptions.options.material,
    undefined,
  );
  // 6. Validate snapshot was created - verify variant was updated successfully
  TestValidator.equals(
    "variant updated - product matches",
    updateOptions.product.id,
    product.id,
  );
  // 7. Verify audit trail - variant has proper timestamps
  TestValidator.predicate(
    "variant has valid update timestamp",
    () => updateOptions.updatedAt !== undefined,
  );
}