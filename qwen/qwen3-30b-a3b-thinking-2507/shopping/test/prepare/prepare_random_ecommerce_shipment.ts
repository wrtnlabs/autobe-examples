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
    carrier:
      input?.carrier ?? RandomGenerator.pick(["FedEx", "DHL", "USPS", "UPS"]),
    tracking_number:
      input?.tracking_number ?? typia.random<string & tags.Format<"uuid">>(),
    shipping_date:
      input?.shipping_date ??
      RandomGenerator.date(
        new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
    status:
      input?.status ??
      RandomGenerator.pick([
        "shipped",
        "in transit",
        "delivered",
        "out for delivery",
      ]),
  };
}
