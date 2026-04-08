import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall shipment creation data for E2E testing.
 *
 * Generates a complete IShoppingMallShipment.ICreate with randomized values for
 * order item IDs, carrier name, and tracking number. All properties support
 * test-time customization through the DeepPartial input parameter.
 *
 * The order_item_ids array contains 1-5 random UUIDs by default, representing
 * the order items to include in this shipment. The carrier_name uses a realistic
 * 2-word name format, and tracking_number is a 16-character alphanumeric string.
 */
export function prepare_random_shopping_mall_shipment(
  input?: DeepPartial<IShoppingMallShipment.ICreate>,
): IShoppingMallShipment.ICreate {
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
    carrier_name: input?.carrier_name ?? RandomGenerator.name(2),
    tracking_number: input?.tracking_number ?? RandomGenerator.alphaNumeric(16),
  };
}
