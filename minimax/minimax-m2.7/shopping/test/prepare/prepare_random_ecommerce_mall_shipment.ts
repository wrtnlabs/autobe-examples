import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

const CARRIERS = [
  "DHL",
  "FedEx",
  "UPS",
  "USPS",
  "EMS",
  "Korea Post",
  "Lotte Global Logis",
  "CJ Logistics",
] as const;
export function prepare_random_ecommerce_mall_shipment(
  input?: DeepPartial<IEcommerceMallShipment.ICreate>,
): IEcommerceMallShipment.ICreate {
  return {
    orderItemIds: input?.orderItemIds
      ? input.orderItemIds.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
    carrier: input?.carrier ?? RandomGenerator.pick(CARRIERS),
    trackingNumber:
      input?.trackingNumber ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<10> & tags.Maximum<20>
        >(),
      ),
  };
}
