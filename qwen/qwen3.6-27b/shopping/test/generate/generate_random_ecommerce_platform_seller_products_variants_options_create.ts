import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_product_variant_option } from "../prepare/prepare_random_ecommerce_platform_product_variant_option";

/**
 * Generate a random product variant option for E2E testing.
 *
 * Prepares random attribute key-value pair data using the prepare function, then calls the creation endpoint to add the option to a specific product variant. The option defines a configuration attribute for the variant, such as color/Red or size/Large. The variant is identified by its parent product's UUID and SKU code provided as URL parameters.
 *
 * The authenticated seller must own the parent product for this operation to succeed. Duplicate attribute keys within the same variant will result in a conflict error.
 */
export async function generate_random_ecommerce_platform_seller_products_variants_options_create(
  connection: api.IConnection,
  props: {
    body?:
      | DeepPartial<IEcommercePlatformProductVariantOption.ICreate>
      | undefined;
    params: {
      productId: string;
      skuCode: string;
    };
  },
): Promise<IEcommercePlatformProductVariantOption> {
  const prepared: IEcommercePlatformProductVariantOption.ICreate =
    prepare_random_ecommerce_platform_product_variant_option(props.body);
  const result: IEcommercePlatformProductVariantOption =
    await api.functional.ecommercePlatform.seller.products.variants.options.create(
      connection,
      {
        body: prepared,
        productId: props.params.productId,
        skuCode: props.params.skuCode,
      },
    );
  return result;
}
