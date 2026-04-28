import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformCategory";
import type { IEcommercePlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProduct";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import type { IEcommercePlatformProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariant";
import type { IEcommercePlatformProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductVariantOption";
import type { IEcommercePlatformSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_product } from "../prepare/prepare_random_ecommerce_platform_product";

/**
 * Generate a random ecommerce platform product for E2E testing.
 *
 * Creates a new product listing for the authenticated seller's shop with randomized name, description, base price, and category assignment. The product is automatically associated with the seller's shop profile derived from the authenticated session.
 *
 * Products created through this operation appear in search results and category listings. Only approved sellers can create products.
 */
export async function generate_random_ecommerce_platform_seller_products_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformProduct.ICreate> | undefined;
  },
): Promise<IEcommercePlatformProduct> {
  const prepared: IEcommercePlatformProduct.ICreate =
    prepare_random_ecommerce_platform_product(props.body);
  return await api.functional.ecommercePlatform.seller.products.create(
    connection,
    {
      body: prepared,
    },
  );
}
