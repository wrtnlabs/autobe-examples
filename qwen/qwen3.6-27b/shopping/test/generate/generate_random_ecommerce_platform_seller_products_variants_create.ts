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

import { prepare_random_ecommerce_platform_product_variant } from "../prepare/prepare_random_ecommerce_platform_product_variant";

/**
 * Generate a random product variant for an existing product via the API for E2E testing.
 *
 * Prepares random product variant data using the prepare function, including a unique
 * alphanumeric SKU code, optional price override, and option configurations such as
 * color, size, material, style, or weight. The options array always contains at least
 * one attribute key-value pair.
 *
 * Calls the creation endpoint to create the variant under the specified parent product
 * identified by productId. The parent product must exist, not be soft-deleted, and be
 * owned by the authenticated seller. Stock quantity is automatically initialized at
 * zero upon creation, and an inventory ledger record is created for tracking.
 */
export async function generate_random_ecommerce_platform_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformProductVariant.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IEcommercePlatformProductVariant> {
  const prepared: IEcommercePlatformProductVariant.ICreate =
    prepare_random_ecommerce_platform_product_variant(props.body);
  return await api.functional.ecommercePlatform.seller.products.variants.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
