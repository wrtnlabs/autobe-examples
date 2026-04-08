import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shipment-item creation data for E2E testing.
 *
 * Generates a valid IMallPlatformShipmentItem.ICreate payload with a non-empty
 * list of unique order item UUIDs. Callers may override the generated IDs for
 * deterministic scenarios, and any missing nested array elements are filled in
 * with valid UUIDs.
 *
 * @param input - Partial overrides for test customization
 * @returns A valid shipment-item creation request body
 */
export function prepare_random_mall_platform_shipment_item(
  input?: DeepPartial<IMallPlatformShipmentItem.ICreate> | undefined,
): IMallPlatformShipmentItem.ICreate {
  return {
    orderItemIds: input?.orderItemIds
      ? input.orderItemIds.map(
          (orderItemId) =>
            orderItemId ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
  };
}
