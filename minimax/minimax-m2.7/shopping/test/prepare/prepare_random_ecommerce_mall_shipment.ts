import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_ecommerce_mall_shipment(
  input?: DeepPartial<IEcommerceMallShipment.ICreate>,
): IEcommerceMallShipment.ICreate {
  return {
    orderId: input?.orderId ?? typia.random<string & tags.Format<"uuid">>(),
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
    carrier:
      input?.carrier ??
      RandomGenerator.pick(["DHL", "FedEx", "UPS", "USPS"] as const),
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(20),
  };
}
