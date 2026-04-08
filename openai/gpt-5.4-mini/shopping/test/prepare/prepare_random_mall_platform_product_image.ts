import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random product image creation data for E2E testing.
 *
 * Generates a complete IMallPlatformProductImage.ICreate payload with realistic
 * defaults while allowing test cases to override any field through DeepPartial
 * input.
 */
export function prepare_random_mall_platform_product_image(
  input?: DeepPartial<IMallPlatformProductImage.ICreate> | undefined,
): IMallPlatformProductImage.ICreate {
  return {
    imageUrl: input?.imageUrl ?? typia.random<string & tags.Format<"uri">>(),
    sortOrder:
      input?.sortOrder ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    isMain: input?.isMain ?? false,
  };
}
