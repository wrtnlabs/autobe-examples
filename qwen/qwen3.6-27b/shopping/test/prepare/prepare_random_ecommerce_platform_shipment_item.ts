import { IEcommercePlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shipment item creation data for E2E testing.
 *
 * Generates a complete IEcommercePlatformShipmentItem.ICreate with randomized values.
 *
 * This function creates test data for adding multiple order items to an existing
 * shipment. It generates an array of random UUID strings representing order item
 * identifiers that will be bundled into the shipment for combined delivery
 * tracking.
 *
 * @param input - Optional DeepPartial<IEcommercePlatformShipmentItem.ICreate.
 *   Properties can be overridden for specific test scenarios.
 * @returns A complete IEcommercePlatformShipmentItem.ICreate object with
 *   randomized values.
 */
export function prepare_random_ecommerce_platform_shipment_item(
  input?: DeepPartial<IEcommercePlatformShipmentItem.ICreate>,
): IEcommercePlatformShipmentItem.ICreate {
  return {
    order_item_ids: input?.order_item_ids
      ? input.order_item_ids.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
  };
}
