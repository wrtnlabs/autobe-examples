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
    carrierName:
      input?.carrierName ??
      RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS", "TNT"] as const),
    trackingNumber:
      input?.trackingNumber ?? RandomGenerator.alphaNumeric(12).toUpperCase(),
    orderId: input?.orderId ?? typia.random<string & tags.Format<"uuid">>(),
    orderItemIds:
      input?.orderItemIds ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => typia.random<string & tags.Format<"uuid">>(),
      ),
  };
}
