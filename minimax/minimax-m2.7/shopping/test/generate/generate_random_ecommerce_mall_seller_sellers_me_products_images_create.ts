import api from "@ORGANIZATION/PROJECT-api";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_image } from "../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Generate a random product image for E2E testing.
 *
 * Prepares random product image data using the prepare function, then uploads
 * the image to the specified product via the seller API. The first uploaded
 * image for a product becomes the main thumbnail displayed in search results
 * and product listings.
 *
 * **Use Cases**:
 * - Upload product gallery images during test product creation
 * - Test image limit validation (max 10 images per product)
 * - Test thumbnail management (first image = main thumbnail)
 *
 * @param connection - API connection with authentication
 * @param props.body - Optional image data overrides (e.g., specific imageUrl)
 * @param props.params.productId - UUID of the product to attach the image to
 * @returns The created product image record with ID and display order
 */
export async function generate_random_ecommerce_mall_seller_sellers_me_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallProductImage.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IEcommerceMallProductImage> {
  const prepared: IEcommerceMallProductImage.ICreate =
    prepare_random_ecommerce_mall_product_image(props.body);
  const result: IEcommerceMallProductImage =
    await api.functional.ecommerceMall.seller.sellers.me.products.images.create(
      connection,
      {
        body: prepared,
        productId: props.params.productId,
      },
    );
  return result;
}
