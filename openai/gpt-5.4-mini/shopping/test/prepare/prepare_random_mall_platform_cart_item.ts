import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCartItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform cart item creation data for E2E testing.
 *
 * Generates a complete IMallPlatformCartItem.ICreate payload with realistic
 * defaults while allowing test-time overrides through DeepPartial input.
 */
export function prepare_random_mall_platform_cart_item(
  input?: DeepPartial<IMallPlatformCartItem.ICreate> | undefined,
): IMallPlatformCartItem.ICreate {
  return {
    productVariantId:
      input?.productVariantId ?? typia.random<string & tags.Format<"uuid">>(),
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
