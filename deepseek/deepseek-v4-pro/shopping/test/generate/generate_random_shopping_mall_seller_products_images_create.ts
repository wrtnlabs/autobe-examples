import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { prepare_random_shopping_mall_product_image } from "../prepare/prepare_random_shopping_mall_product_image";

/**
 * Generate random product images for an existing product via the API for E2E testing.
 *
 * Prepares random product image data using the prepare function, then uploads the image to the specified product's gallery through the seller products images create endpoint.
 *
 * The product specified by productId must already exist and be owned by the authenticated seller. The server assigns the next available display order position to the uploaded image — the image with the lowest display order value serves as the main thumbnail in search results, category listings, and product cards.
 *
 * Only the seller who owns the product can upload images. Suspended sellers cannot modify product images even for products they own.
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
