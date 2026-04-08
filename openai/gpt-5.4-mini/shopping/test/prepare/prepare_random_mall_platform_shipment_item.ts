import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shipment item creation data for E2E testing.
 *
 * Generates a complete IMallPlatformShipmentItem.ICreate payload with a valid
 * non-empty list of order item UUIDs. Caller-provided values are preserved and
 * missing fields are filled with realistic random data.
 */
export function prepare_random_mall_platform_shipment_item(
  input?: DeepPartial<IMallPlatformShipmentItem.ICreate> | undefined,
): IMallPlatformShipmentItem.ICreate {
  return {
    orderItemIds:
      input?.orderItemIds && input.orderItemIds.length > 0
        ? input.orderItemIds.map(
            (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
          )
        : ArrayUtil.repeat(1, () =>
            typia.random<string & tags.Format<"uuid">>(),
          ),
  };
}
