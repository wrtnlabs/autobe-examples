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
 * Test business rule enforcement: creating a variant with the exact same option key-value combination as an existing variant of the same product is rejected with a 409 Conflict response.
 *
 * Validates that the platform enforces the uniqueness constraint on option value combinations per product. No two variants of the same product may share identical option key-value pairs, even when the SKU codes differ.
 *
 * 1. Registers a seller account via the seller join endpoint and captures the authentication token.
 * 2. Creates a product under the authenticated seller using the product creation utility.
 * 3. Creates a first variant with specific options [{key:'color', value:'Red'}, {key:'size', value:'Large'}] and SKU 'SKU-ORIGINAL-001' — this succeeds normally.
 * 4. Attempts to create a second variant with the identical option combination but SKU 'SKU-DUPLICATE-001' — expects HTTP 409 Conflict error indicating that the option value combination already exists for this product.
 */
export async function test_api_product_variant_creation_duplicate_option_combination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);
  // 2. Create a product (no category)
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: { category_id: undefined },
    },
  );
  typia.assert(product);
  // 3. Create the first variant with specific options (success case)
  const firstVariant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-ORIGINAL-001",
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(firstVariant);
  // 4. Attempt to create a variant with identical option combination → 409 Conflict
  await TestValidator.httpError(
    "duplicate option combination should be rejected",
    409,
    async () => {
      await api.functional.eCommerceMall.seller.products.variants.create(
        sellerConnection,
        {
          productId: product.id,
          body: {
            sku_code: "SKU-DUPLICATE-001",
            options: [
              { key: "color", value: "Red" },
              { key: "size", value: "Large" },
            ],
          } satisfies IECommerceMallProductVariant.ICreate,
        },
      );
    },
  );
}
