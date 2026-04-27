import { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall product image creation data for E2E testing.
 *
 * Generates a complete IECommerceMallProductImage.ICreate with a randomized image
 * URL. The URL is generated using typia.random with the URL format tag to ensure
 * valid URL syntax compliance.
 *
 * The first image uploaded for a product becomes the thumbnail (sort position 0),
 * and subsequent images are placed after all existing ones.
 *
 * @param input Optional partial input to override specific properties
 * @returns A complete IECommerceMallProductImage.ICreate with generated data
 */
export function prepare_random_ecommerce_mall_product_image(
  input?: DeepPartial<IECommerceMallProductImage.ICreate> | undefined,
): IECommerceMallProductImage.ICreate {
  return {
    url: input?.url ?? typia.random<string & tags.Format<"url">>(),
  };
}
