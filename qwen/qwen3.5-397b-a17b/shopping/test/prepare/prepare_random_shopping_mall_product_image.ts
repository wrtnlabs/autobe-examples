import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall product image creation data for E2E testing.
 *
 * Generates a complete IShoppingMallProductImage.ICreate with randomized values for
 * uploading a new product image to a product's gallery. The URL points to an image
 * file in object storage or CDN, and display_order determines the gallery position.
 *
 * Both properties support test-time customization through the DeepPartial input
 * parameter, allowing tests to override specific fields while auto-generating others.
 *
 * @param input - Optional partial input for test customization
 * @returns Complete IShoppingMallProductImage.ICreate object
 */
export function prepare_random_shopping_mall_product_image(
  input?: DeepPartial<IShoppingMallProductImage.ICreate>,
): IShoppingMallProductImage.ICreate {
  return {
    url: input?.url ?? typia.random<string & tags.Format<"uri">>(),
    display_order:
      input?.display_order ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
  };
}
