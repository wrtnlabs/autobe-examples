import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSeller";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_platform_seller_products_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_create";
import { generate_random_ecommerce_platform_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_create";
import { generate_random_ecommerce_platform_seller_products_variants_options_create } from "../../../generate/generate_random_ecommerce_platform_seller_products_variants_options_create";
import { prepare_random_ecommerce_platform_product } from "../../../prepare/prepare_random_ecommerce_platform_product";
import { prepare_random_ecommerce_platform_product_variant } from "../../../prepare/prepare_random_ecommerce_platform_product_variant";
import { prepare_random_ecommerce_platform_product_variant_option } from "../../../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Test that product variant options become inaccessible after the parent variant is soft-deleted.
 *
 * This validates cascade soft-delete behavior where options are deleted when their parent variant is deleted,
 * and the public GET endpoint returns 404 for deleted options.
 *
 * 1. Seller joins and authenticates.
 * 2. Seller creates a product.
 * 3. Seller creates a variant for the product.
 * 4. Seller creates an option for the variant.
 * 5. Seller soft-deletes the parent variant.
 * 6. Validates that the public GET endpoint returns 404 for the option, confirming cascade soft-delete.
 */
export async function test_api_product_variant_option_404_after_parent_variant_soft_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller authentication
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, { body: {} });
  // 2. Create a product
  const product =
    await generate_random_ecommerce_platform_seller_products_create(
      sellerConnection,
      {
        body: {},
      },
    );
  typia.assert(product);
  // 3. Create a variant for the product
  const variant =
    await generate_random_ecommerce_platform_seller_products_variants_create(
      sellerConnection,
      {
        body: {},
        params: {
          productId: product.id,
        },
      },
    );
  typia.assert(variant);
  // 4. Create an option for the variant
  const option =
    await generate_random_ecommerce_platform_seller_products_variants_options_create(
      sellerConnection,
      {
        body: {},
        params: {
          productId: product.id,
          skuCode: variant.sku_code,
        },
      },
    );
  typia.assert(option);
  // 5. Soft-delete the parent variant
  await api.functional.ecommercePlatform.seller.products.variants.erase(
    sellerConnection,
    {
      productId: product.id,
      skuCode: variant.sku_code,
    },
  );
  // 6. Validate that the public GET endpoint returns 404 for the option
  await TestValidator.httpError(
    "option returns 404 after parent variant soft-deleted",
    404,
    async () => {
      await api.functional.ecommercePlatform.products.variants.options.at(
        sellerConnection,
        {
          productId: product.id,
          variantId: variant.id,
          optionId: option.id,
        },
      );
    },
  );
}
