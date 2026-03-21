import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
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
import { generate_random_ecommerce_mall_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_options_create";
import { generate_random_ecommerce_mall_seller_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option_value } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option_value";

/**
 * Test that a seller cannot update option values on a product variant belonging to another seller.
 *
 * Steps:
 * 1. Authenticate as first seller and create a product with a variant and option
 * 2. Authenticate as second seller
 * 3. Second seller attempts to update the option value on first seller's variant
 *
 * Validation points:
 * - Response returns 403 or 404 status indicating access denied
 * - Second seller cannot modify first seller's variant options
 * - System enforces product ownership verification before allowing variant modifications
 */
export async function test_api_product_variant_option_update_by_non_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first seller (owner of the product)
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1 = await authorize_seller_join(seller1Connection, {});
  // 2. Create product with variant and option as first seller
  const product = await generate_random_ecommerce_mall_seller_products_create(
    seller1Connection,
    {},
  );
  const variant =
    await generate_random_ecommerce_mall_seller_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product.id },
      },
    );
  const option =
    await generate_random_ecommerce_mall_seller_products_variants_options_create(
      seller1Connection,
      {
        params: { productId: product.id, variantId: variant.id },
      },
    );
  // 3. Authenticate as second seller (non-owner)
  const seller2Connection: api.IConnection = { host: connection.host };
  await authorize_seller_join(seller2Connection, {});
  // 4. Second seller attempts to update option value on first seller's variant
  // This should fail with 403 Forbidden or 404 Not Found
  await TestValidator.error(
    "non-owner cannot update variant option",
    async () =>
      await api.functional.ecommerceMall.seller.products.variants.options.update(
        seller2Connection,
        {
          productId: product.id,
          variantId: variant.id,
          optionKey: option.key,
          body: {
            value: "Updated Value",
          } satisfies IEcommerceMallProductVariantOptionValue.IUpdate,
        },
      ),
  );
}
