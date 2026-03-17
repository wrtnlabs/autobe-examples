import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { IShoppingMallTrackingInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallTrackingInfo";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_shopping_mall_shipment(
  input?: DeepPartial<IShoppingMallShipment.ICreate>,
): IShoppingMallShipment.ICreate {
  return {
    orderItemIds: input?.orderItemIds
      ? input.orderItemIds.length > 0
        ? input.orderItemIds.map(
            (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
          )
        : [typia.random<string & tags.Format<"uuid">>()]
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
    trackingInfo: input?.trackingInfo
      ? {
          carrier_name:
            input.trackingInfo.carrier_name ??
            RandomGenerator.pick([
              "CJ Logistics",
              "HanJin",
              "Korea Post",
              "Lotte Global Logistics",
              "FedEx",
            ] as const),
          tracking_number:
            input.trackingInfo.tracking_number ??
            RandomGenerator.alphaNumeric(14),
          tracking_url:
            input.trackingInfo.tracking_url !== undefined
              ? input.trackingInfo.tracking_url
              : typia.random<string & tags.Format<"uri">>(),
        }
      : {
          carrier_name: RandomGenerator.pick([
            "CJ Logistics",
            "HanJin",
            "Korea Post",
            "Lotte Global Logistics",
            "FedEx",
          ] as const),
          tracking_number: RandomGenerator.alphaNumeric(14),
          tracking_url: typia.random<string & tags.Format<"uri">>(),
        },
  };
}
