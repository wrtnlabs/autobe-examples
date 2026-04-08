import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product_variant } from "../prepare/prepare_random_mall_platform_product_variant";

/**
 * Generate a random product variant for an existing product via the API for E2E testing.
 *
 * Prepares random product variant creation data using the prepare function, then calls
 * the seller product variant creation endpoint for the specified product.
 *
 * The created variant is returned directly from the API and can be used in follow-up
 * E2E scenarios that require a purchasable SKU under a product.
 */
export async function generate_random_mall_platform_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformProductVariant.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IMallPlatformProductVariant> {
  const prepared: IMallPlatformProductVariant.ICreate =
    prepare_random_mall_platform_product_variant(props.body);
  const result: IMallPlatformProductVariant =
    await api.functional.mallPlatform.seller.products.variants.create(
      connection,
      {
        body: prepared,
        productId: props.params.productId,
      },
    );
  return result;
}
