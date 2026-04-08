import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product image creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallProductImage.ICreate with a randomized
 * image URL. The imageUrl property must be a valid URI pointing to a
 * pre-uploaded image file in file storage. Supported formats include JPEG,
 * PNG, WebP, and GIF.
 *
 * The first uploaded image for a product becomes the main thumbnail displayed
 * in search results and product listings.
 */
export function prepare_random_ecommerce_mall_product_image(
  input?: DeepPartial<IEcommerceMallProductImage.ICreate>,
): IEcommerceMallProductImage.ICreate {
  return {
    imageUrl: input?.imageUrl ?? typia.random<string & tags.Format<"uri">>(),
  };
}
