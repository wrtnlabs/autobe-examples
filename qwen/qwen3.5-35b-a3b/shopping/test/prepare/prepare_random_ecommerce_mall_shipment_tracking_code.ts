import { IEcommerceMallShipmentTrackingCode } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentTrackingCode";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_shipment_tracking_code(
  input?: DeepPartial<IEcommerceMallShipmentTrackingCode.ICreate>,
): IEcommerceMallShipmentTrackingCode.ICreate {
  return {
    carrierName:
      input?.carrierName ??
      RandomGenerator.pick(["FedEx", "UPS", "DHL", "USPS", "Aramex"] as const),
    trackingCode:
      input?.trackingCode ??
      RandomGenerator.alphaNumeric(
        typia.random<number & tags.Minimum<10> & tags.Maximum<20>>(),
      ),
  };
}
