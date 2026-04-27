import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that updating a variant's options to a combination already existing on another variant of the same product returns a 409 Conflict error.
 *
 * Validates the backend constraint that no two variants of the same product can share identical option key-value pairs. Tests the scenario by first creating two variants with distinct options, then attempting to update the second variant's options to match the first variant's combination.
 *
 * 1. Seller joins and creates a product.
 * 2. Two variants are created with distinct option combinations (color, size).
 * 3. Attempting to update the second variant's options to the first variant's combination is rejected with 409.
 *
 * @param connection - The API connection configuration
 */
export async function test_api_product_variant_duplicate_option_combination_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 2. Create product
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create Variant A with options [color: 'Red', size: 'Small']
  const variantA =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Small" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        } satisfies DeepPartial<IECommerceMallProductVariant.ICreate>,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variantA);
  // 4. Create Variant B with options [color: 'Blue', size: 'Large']
  const variantB =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Large" },
          ] satisfies IECommerceMallProductVariant.IOption[],
        } satisfies DeepPartial<IECommerceMallProductVariant.ICreate>,
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variantB);
  // 5. Attempt to update Variant B's options to duplicate Variant A's combination
  const duplicateOptions: IECommerceMallProductVariantOption[] = [
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      key: "color",
      value: "Red",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      variant: typia.random<IECommerceMallProductVariant.ISummary>(),
    },
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      key: "size",
      value: "Small",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
      variant: typia.random<IECommerceMallProductVariant.ISummary>(),
    },
  ] satisfies IECommerceMallProductVariantOption[];
  await TestValidator.httpError(
    "duplicate option combination should be rejected",
    409,
    async () => {
      await api.functional.eCommerceMall.seller.products.variants.update(
        sellerConnection,
        {
          productId: product.id,
          variantId: variantB.id,
          body: {
            options: duplicateOptions,
          } satisfies IECommerceMallProductVariant.IUpdate,
        },
      );
    },
  );
}
