import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IMallPlatformShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random mall platform shipment creation data for E2E testing.
 *
 * Generates a complete IMallPlatformShipment.ICreate object with realistic
 * carrier, tracking, and order item data. Any provided DeepPartial input values
 * are preserved, and missing fields are filled with valid randomized defaults.
 */
export function prepare_random_mall_platform_shipment(
  input?: DeepPartial<IMallPlatformShipment.ICreate> | undefined,
): IMallPlatformShipment.ICreate {
  return {
    carrierName: input?.carrierName ?? RandomGenerator.name(2),
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(12),
    trackingUrl:
      input?.trackingUrl ?? typia.random<string & tags.Format<"url">>(),
    orderItemIds: input?.orderItemIds
      ? input.orderItemIds.map(
          (id) => id ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
  };
}
