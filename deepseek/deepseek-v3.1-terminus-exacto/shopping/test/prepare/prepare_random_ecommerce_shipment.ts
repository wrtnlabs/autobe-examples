import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_shipment(
  input?: DeepPartial<IEcommerceShipment.ICreate> | undefined,
): IEcommerceShipment.ICreate {
  return {
    tracking_number:
      input?.tracking_number ?? typia.random<string & tags.Format<"uuid">>(),
    carrier_name:
      input?.carrier_name ??
      RandomGenerator.pick([
        "UPS",
        "FedEx",
        "USPS",
        "DHL",
        "Amazon Logistics",
      ] as const),
    shipping_cost:
      input?.shipping_cost ??
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
  };
}
