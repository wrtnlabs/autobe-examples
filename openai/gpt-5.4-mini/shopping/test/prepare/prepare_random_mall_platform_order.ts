import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformOrder";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform order creation data for E2E testing.
 *
 * Generates a valid IMallPlatformOrder.ICreate payload for administrator force-cancel tests.
 * The required scope field is always populated with a valid enum value, and optional order item IDs
 * are generated as UUIDs when not provided by the test input.
 */
export function prepare_random_mall_platform_order(
  input?: DeepPartial<IMallPlatformOrder.ICreate> | undefined,
): IMallPlatformOrder.ICreate {
  return {
    scope:
      input?.scope ??
      RandomGenerator.pick(["wholeOrder", "selectedItems"] as const),
    orderItemIds:
      input?.orderItemIds === undefined
        ? undefined
        : input.orderItemIds.map(
            (item) => item ?? typia.random<string & tags.Format<"uuid">>(),
          ),
  };
}
