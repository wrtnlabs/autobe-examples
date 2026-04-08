import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { IMallPlatformShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipmentItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform shipment creation data for E2E testing.
 *
 * Generates a complete {@link IMallPlatformShipment.ICreate} payload with
 * realistic shipping metadata and at least one shipment item. Every field can
 * be overridden through DeepPartial input, including nested shipment-item order
 * identifiers.
 *
 * This helper is intended for tests that need valid shipment creation bodies
 * while still allowing targeted customization of carrier, tracking, and item
 * attachment data.
 */
export function prepare_random_mall_platform_shipment(
  input?: DeepPartial<IMallPlatformShipment.ICreate> | undefined,
): IMallPlatformShipment.ICreate {
  return {
    shipmentItems: input?.shipmentItems
      ? input.shipmentItems.map((item) => ({
          orderItemIds:
            item.orderItemIds ??
            ArrayUtil.repeat(
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              () => typia.random<string & tags.Format<"uuid">>(),
            ),
        }))
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          () => ({
            orderItemIds: ArrayUtil.repeat(
              typia.random<
                number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
              >(),
              () => typia.random<string & tags.Format<"uuid">>(),
            ),
          }),
        ),
    carrierName: input?.carrierName ?? RandomGenerator.name(2),
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(12),
  };
}
