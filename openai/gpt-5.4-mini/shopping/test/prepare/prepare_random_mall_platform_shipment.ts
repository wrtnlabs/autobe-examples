import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_mall_platform_shipment(
  input?: DeepPartial<IMallPlatformShipment.ICreate> | undefined,
): IMallPlatformShipment.ICreate {
  return {
    mallPlatformOrderId:
      input?.mallPlatformOrderId ??
      typia.random<string & tags.Format<"uuid">>(),
    carrierName: input?.carrierName ?? RandomGenerator.name(2),
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(12),
    trackingUrl:
      input?.trackingUrl ?? typia.random<string & tags.Format<"url">>(),
    shipmentItems: input?.shipmentItems
      ? input.shipmentItems.map((shipmentItem) => ({
          orderItemId:
            shipmentItem.orderItemId ??
            typia.random<string & tags.Format<"uuid">>(),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            orderItemId: typia.random<string & tags.Format<"uuid">>(),
          }),
        ),
  };
}
