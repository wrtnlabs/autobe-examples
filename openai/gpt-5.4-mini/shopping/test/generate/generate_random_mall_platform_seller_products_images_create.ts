import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_mall_platform_product_image } from "../prepare/prepare_random_mall_platform_product_image";

/**
 * Generate a random product image for a seller-owned product via the API for E2E testing.
 *
 * Prepares random product image creation data using the prepare function, then attaches the image to the specified product through the seller product images creation endpoint. The created product image is returned for use in downstream E2E test scenarios.
 *
 * The product ID must be provided in props.params so the image can be created against an existing product owned by the authenticated seller. Any fields supported by the prepare function may be overridden through props.body.
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
