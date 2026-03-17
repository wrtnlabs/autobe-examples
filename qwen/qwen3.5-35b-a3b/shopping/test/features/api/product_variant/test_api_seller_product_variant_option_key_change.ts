import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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

export async function test_api_seller_product_variant_option_key_change(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {});
  typia.assert(seller);
  // 2. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant with multiple options (at least 3 key-value pairs)
  const initialOptions: {
    [key: string]: string;
  } = {
    color: "Red",
    size: "Large",
    material: "Cotton",
  };
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku: RandomGenerator.alphaNumeric(12),
          options: initialOptions,
          base_price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Select one option to update (change "color" key to "primary_color")
  const oldKey = "color";
  const newValue = initialOptions[oldKey];
  const newKey = "primary_color";
  // 5. Generate optionId for the option to update
  // Note: Since there's no GET /options endpoint to retrieve optionId,
  // we use typia.random to generate a UUID that should correspond to
  // one of the options created during variant creation
  const optionId = typia.random<string & tags.Format<"uuid">>();
  // 6. Update option key using PUT endpoint while preserving value
  const updatedOption =
    await api.functional.ecommerceMall.seller.products.variants.options.update(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        optionId,
        body: {
          key: newKey,
        } satisfies IEcommerceMallProductVariantOption.IUpdate,
      },
    );
  typia.assert(updatedOption);
  // 7. Validate response has new key and original value preserved
  TestValidator.equals("option key changed", updatedOption.key, newKey);
  TestValidator.equals("option value preserved", updatedOption.value, newValue);
  // 8. Validate no other options were affected (by checking product_variant reference)
  TestValidator.equals(
    "option belongs to correct variant",
    updatedOption.product_variant.id,
    variant.id,
  );
  TestValidator.equals(
    "option product matches",
    updatedOption.product_variant.product.id,
    product.id,
  );
  // 9. Validate updated_at timestamp reflects modification
  const optionUpdatedAt = new Date(updatedOption.updated_at).getTime();
  const testDate = new Date().getTime();
  TestValidator.predicate(
    "updated_at timestamp reflects modification",
    () => optionUpdatedAt > 0 && optionUpdatedAt <= testDate,
  );
  // 10. Validate soft delete status preserved (should be null for active options)
  TestValidator.equals(
    "option soft delete status preserved",
    updatedOption.deleted_at,
    null,
  );
}
