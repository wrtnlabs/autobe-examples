import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product image creation data for E2E testing.
 *
 * Generates a complete IShoppingMallProductImage.ICreate with a randomized
 * image URL. The image URL is a valid URL format string, suitable for
 * uploading images to a product's gallery during testing.
 *
 * The server assigns display order positions sequentially — the image with
 * the lowest display_order value serves as the main thumbnail in search
 * results, category listings, and product cards.
 */
export function prepare_random_shopping_mall_product_image(
  input?: DeepPartial<IShoppingMallProductImage.ICreate>,
): IShoppingMallProductImage.ICreate {
  return {
    image_url: input?.image_url ?? typia.random<string & tags.Format<"url">>(),
  };
}
