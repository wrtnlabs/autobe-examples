import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipment(
  input?: DeepPartial<IShoppingMallShipment.ICreate> | undefined,
): IShoppingMallShipment.ICreate {
  return {
    order_item_ids:
      input?.order_item_ids ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
        >(),
        () => typia.random<string & tags.Format<"uuid">>(),
      ),
    tracking_carrier:
      input?.tracking_carrier ??
      RandomGenerator.pick([
        "FedEx",
        "UPS",
        "DHL",
        "USPS",
        "LaserShip",
        "OnTrac",
      ] as const),
    tracking_number:
      input?.tracking_number ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<12> & tags.Maximum<20>
        >(),
      ),
  };
}
