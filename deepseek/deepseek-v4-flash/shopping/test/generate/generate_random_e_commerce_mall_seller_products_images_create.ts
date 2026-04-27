import api from "@ORGANIZATION/PROJECT-api";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_ecommerce_mall_product_image } from "../prepare/prepare_random_ecommerce_mall_product_image";

/**
 * Generate a random product image via the API for E2E testing.
 *
 * Prepares random product image data using the prepare function, then calls
 * the image creation endpoint to associate the image with the specified
 * product. The first image uploaded becomes the thumbnail (sort position 0),
 * and subsequent images are placed after all existing ones.
 *
 * Only the seller who owns the product can upload images. Sellers must have
 * an 'approved' approval status to perform this operation.
 *
 * @param connection The API connection object
 * @param props.body Optional partial input to override specific properties
 * @param props.params URL path parameters including the product ID
 * @returns The newly created product image record with server-assigned sort position
 */
export async function generate_random_e_commerce_mall_seller_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallProductImage.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IECommerceMallProductImage> {
  const prepared: IECommerceMallProductImage.ICreate =
    prepare_random_ecommerce_mall_product_image(props.body);
  return await api.functional.eCommerceMall.seller.products.images.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
