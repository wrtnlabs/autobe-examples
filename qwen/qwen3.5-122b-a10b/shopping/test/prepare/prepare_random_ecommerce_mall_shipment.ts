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
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(12),
    carrierName:
      input?.carrierName ??
      RandomGenerator.pick([
        "FedEx",
        "UPS",
        "DHL",
        "USPS",
        "TNT",
        "Aramex",
      ] as const),
    shippedAt:
      input?.shippedAt ?? typia.random<string & tags.Format<"date-time">>(),
    orderItemIds: input?.orderItemIds
      ? input.orderItemIds.length > 0
        ? input.orderItemIds
        : ArrayUtil.repeat(
            typia.random<
              number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
            >(),
            () => typia.random<string & tags.Format<"uuid">>(),
          )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
  };
}
