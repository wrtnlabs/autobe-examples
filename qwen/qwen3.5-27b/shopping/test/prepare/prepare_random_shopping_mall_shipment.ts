import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random shopping mall shipment creation data for E2E testing.
 *
 * Generates a complete IShoppingMallShipment.ICreate with randomized values.
 * Supports optional input to override specific fields.
 */
export function prepare_random_shopping_mall_shipment(
  input?: DeepPartial<IShoppingMallShipment.ICreate>,
): IShoppingMallShipment.ICreate {
  return {
    carrier_name: input?.carrier_name ?? RandomGenerator.alphabets(10),
    tracking_number: input?.tracking_number ?? RandomGenerator.alphaNumeric(16),
    order_item_ids:
      input?.order_item_ids ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => typia.random<string & tags.Format<"uuid">>(),
      ),
    order_id: input?.order_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
