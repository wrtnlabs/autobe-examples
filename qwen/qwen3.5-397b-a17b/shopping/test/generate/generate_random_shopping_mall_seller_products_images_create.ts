import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_image } from "../prepare/prepare_random_shopping_mall_product_image";

/**
 * Generate a random shopping mall product image via the API for E2E testing.
 *
 * Creates a product image attached to the product specified by productId. The image
 * includes a randomized URL pointing to object storage or CDN, and a display_order
 * determining its position in the product gallery.
 *
 * The prepare function generates valid test data with proper URI format for the url
 * field and non-negative integer for display_order. Tests can customize specific
 * fields through the DeepPartial input parameter while auto-generating others.
 *
 * @param connection - API connection information with host and headers
 * @param props - Optional body customization and required productId URL parameter
 * @param props.body - Optional partial IShoppingMallProductImage.ICreate for test customization
 * @param props.params - Required URL parameters including productId
 * @param props.params.productId - The UUID of the product to add the image to
 * @returns The newly created IShoppingMallProductImage with id, timestamps, and product relation
 */
export async function generate_random_shopping_mall_seller_products_images_create(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallProductImage.ICreate>;
    params: {
      productId: string;
    };
  },
): Promise<IShoppingMallProductImage> {
  const prepared: IShoppingMallProductImage.ICreate =
    prepare_random_shopping_mall_product_image(props.body);
  const result: IShoppingMallProductImage =
    await api.functional.shoppingMall.seller.products.images.create(
      connection,
      {
        productId: props.params.productId,
        body: prepared,
      },
    );
  return result;
}
