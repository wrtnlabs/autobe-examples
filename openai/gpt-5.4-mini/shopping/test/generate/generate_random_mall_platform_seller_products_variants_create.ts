import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductVariant";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product_variant } from "../prepare/prepare_random_mall_platform_product_variant";

/**
 * Generate a random mall platform product variant via the API for E2E testing.
 *
 * Prepares a valid product variant creation payload using the dedicated prepare
 * function, then creates the variant under the specified product through the
 * seller product-variant creation endpoint.
 *
 * The product ID is required because variants are created beneath an existing
 * product. Any provided body fields are merged through the prepare function so
 * tests can override SKU code, option values, or price override while keeping
 * the payload valid.
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
  return await api.functional.mallPlatform.seller.products.variants.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
