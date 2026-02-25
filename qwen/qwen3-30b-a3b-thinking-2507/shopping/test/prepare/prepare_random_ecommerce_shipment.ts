import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_shipment(
  input?: DeepPartial<IEcommerceShipment.ICreate>,
): IEcommerceShipment.ICreate {
  return {
    carrier_name:
      input?.carrier_name ??
      RandomGenerator.pick(["USPS", "FedEx", "UPS", "DHL", "TNT"]),
    tracking_number: input?.tracking_number ?? RandomGenerator.alphaNumeric(16),
  };
}
