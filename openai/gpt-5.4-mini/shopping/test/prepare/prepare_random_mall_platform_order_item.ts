import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrderItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform order-item creation data for E2E testing.
 *
 * Generates a complete IMallPlatformOrderItem.ICreate object with a valid
 * positive quantity value, while allowing test-time overrides through
 * DeepPartial input.
 */
export function prepare_random_mall_platform_order_item(
  input?: DeepPartial<IMallPlatformOrderItem.ICreate> | undefined,
): IMallPlatformOrderItem.ICreate {
  return {
    quantity:
      input?.quantity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
  };
}
