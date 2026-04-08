import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall product image creation data for E2E testing.
 *
 * Generates a complete IShoppingMallProductImage.ICreate with randomized values.
 * The image_uri is generated as a valid URL format string representing an uploaded
 * product image file in the storage system.
 */
export function prepare_random_shopping_mall_product_image(
  input?: DeepPartial<IShoppingMallProductImage.ICreate> | undefined,
): IShoppingMallProductImage.ICreate {
  return {
    image_uri: input?.image_uri ?? typia.random<string & tags.Format<"url">>(),
  };
}
