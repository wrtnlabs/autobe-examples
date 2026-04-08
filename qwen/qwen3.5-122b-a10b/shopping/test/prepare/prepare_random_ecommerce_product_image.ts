import { IEcommerceProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce product image creation data for E2E testing.
 *
 * Generates a complete IEcommerceProductImage.ICreate with randomized values.
 * The image_url is generated as a valid URI format suitable for S3 or CDN storage.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete IEcommerceProductImage.ICreate object
 */
export function prepare_random_ecommerce_product_image(
  input?: DeepPartial<IEcommerceProductImage.ICreate>,
): IEcommerceProductImage.ICreate {
  return {
    image_url:
      input?.image_url ??
      typia.random<string & tags.Format<"uri"> & tags.MaxLength<80000>>(),
  };
}
