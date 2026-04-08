import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product_image } from "../prepare/prepare_random_mall_platform_product_image";

/**
 * Generate a random product image via the API for E2E testing.
 *
 * Prepares random product image creation data using the prepare function, then
 * calls the seller product image creation endpoint for the specified product.
 * The created image record is returned for use in end-to-end test scenarios.
 */
export async function generate_random_mall_platform_seller_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IMallPlatformProductImage.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IMallPlatformProductImage> {
  const prepared: IMallPlatformProductImage.ICreate =
    prepare_random_mall_platform_product_image(props.body);
  return await api.functional.mallPlatform.seller.products.images.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
