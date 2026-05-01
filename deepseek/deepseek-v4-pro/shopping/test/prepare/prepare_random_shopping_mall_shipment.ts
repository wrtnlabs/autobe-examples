import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall shipment creation data for E2E testing.
 *
 * Generates a complete IShoppingMallShipment.ICreate with randomized values
 * suitable for testing shipment creation workflows. Order item IDs are
 * generated as UUIDs with at least one element, carrier name is selected
 * from common shipping carriers, and tracking number is a random
 * alphanumeric string.
 *
 * When input overrides are provided via DeepPartial, any supplied values
 * are preserved and only missing properties are filled with random data.
 * For the orderItemIds array, each element in the input array that is
 * undefined or null will be replaced with a random UUID while valid
 * entries are kept as-is.
 */
export function prepare_random_shopping_mall_shipment(
  input?: DeepPartial<IShoppingMallShipment.ICreate>,
): IShoppingMallShipment.ICreate {
  return {
    orderItemIds: input?.orderItemIds
      ? input.orderItemIds.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
    carrier_name:
      input?.carrier_name ??
      RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS", "TNT"] as const),
    tracking_number: input?.tracking_number ?? RandomGenerator.alphaNumeric(12),
  };
}
