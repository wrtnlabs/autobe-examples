import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_image } from "../prepare/prepare_random_shopping_mall_product_image";

/**
 * Generate a random product image for a shopping mall product via the API for E2E testing.
 *
 * Prepares random product image data using the prepare function, then calls the creation endpoint to upload the image to the specified product. The image is appended to the product's existing image list with an automatically assigned display order.
 *
 * This function requires a valid productId from an existing product that belongs to the authenticated seller. The image_uri is generated as a valid URL format string representing an uploaded product image file in the storage system.
 */
export async function generate_random_shopping_mall_seller_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductImage.ICreate> | undefined;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallProductImage> {
  const prepared: IShoppingMallProductImage.ICreate =
    prepare_random_shopping_mall_product_image(props.body);
  return await api.functional.shoppingMall.seller.products.images.create(
    connection,
    {
      body: prepared,
      productId: props.params.productId,
    },
  );
}
