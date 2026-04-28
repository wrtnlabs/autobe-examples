import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommercePlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_platform_product_image } from "../prepare/prepare_random_ecommerce_platform_product_image";

/**
 * Generate a random product image for a specific product via the API for E2E testing.
 *
 * Prepares random product image data (URI) using the prepare function, then calls
 * the creation endpoint. The system automatically assigns the next available display
 * order index and validates that the product belongs to the authenticated seller.
 *
 * Requires `productId` parameter to specify which product to add images to.
 */
export async function generate_random_ecommerce_platform_seller_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformProductImage.ICreate>;
    params?: {
      productId: string;
    };
  },
): Promise<IEcommercePlatformProductImage> {
  const prepared: IEcommercePlatformProductImage.ICreate =
    prepare_random_ecommerce_platform_product_image(props.body);
  const result: IEcommercePlatformProductImage =
    await api.functional.ecommercePlatform.seller.products.images.create(
      connection,
      {
        productId: props.params!.productId,
        body: prepared,
      },
    );
  return result;
}
