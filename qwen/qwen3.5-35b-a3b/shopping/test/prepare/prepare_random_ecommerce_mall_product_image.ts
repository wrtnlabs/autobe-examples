import { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall product image creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallProductImage.ICreate with randomized values for
 * product image upload scenarios. Includes image URL pointing to valid storage
 * location and display order for positioning in product carousel.
 */
export function prepare_random_ecommerce_mall_product_image(
  input?: DeepPartial<IEcommerceMallProductImage.ICreate>,
): IEcommerceMallProductImage.ICreate {
  return {
    image_url:
      input?.image_url ??
      typia.random<string & tags.Format<"uri"> & tags.MaxLength<80000>>(),
    display_order:
      input?.display_order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
