import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipment(
  input?: DeepPartial<IShoppingMallShipment.ICreate>,
): IShoppingMallShipment.ICreate {
  return {
    order_id: input?.order_id ?? typia.random<string & tags.Format<"uuid">>(),
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
    carrier_name:
      input?.carrier_name ??
      RandomGenerator.pick([
        "FedEx",
        "UPS",
        "DHL",
        "Korean Post",
        "USPS",
      ] as const),
    tracking_number: input?.tracking_number ?? RandomGenerator.alphaNumeric(12),
  };
}
