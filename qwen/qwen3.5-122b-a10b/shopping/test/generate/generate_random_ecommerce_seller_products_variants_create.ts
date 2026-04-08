import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_product_variant } from "../prepare/prepare_random_ecommerce_product_variant";

/**
 * Generate a random product variant (SKU) for the specified product via the API for E2E testing.
 *
 * Prepares random variant data using the prepare function, then calls the creation endpoint to add
 * a new variant to the specified product. The variant represents a unique combination of options
 * such as color, size, material, or other attributes.
 *
 * @param connection - The API connection object with authentication
 * @param props.body - Optional partial variant data to override random generation
 * @param props.params.productId - The UUID of the parent product to add the variant to
 * @returns The created product variant with all fields including generated UUID and timestamps
 */
export async function generate_random_ecommerce_seller_products_variants_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceProductVariant.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceProductVariant> {
  const prepared: IEcommerceProductVariant.ICreate =
    prepare_random_ecommerce_product_variant(props.body);
  const result: IEcommerceProductVariant =
    await api.functional.ecommerce.seller.products.variants.create(connection, {
      productId: props.params.productId,
      body: prepared,
    });
  return result;
}
