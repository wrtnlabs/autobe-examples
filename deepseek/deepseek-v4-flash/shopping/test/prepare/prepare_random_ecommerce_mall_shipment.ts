import { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random e-commerce mall shipment creation data for E2E testing.
 *
 * Generates a complete IECommerceMallShipment.ICreate with randomized values
 * for carrier name, tracking number, and order item UUIDs.
 *
 * @param input - Optional partial input to override specific properties
 * @returns A fully populated IECommerceMallShipment.ICreate instance
 */
export function prepare_random_ecommerce_mall_shipment(
  input?: DeepPartial<IECommerceMallShipment.ICreate> | undefined,
): IECommerceMallShipment.ICreate {
  return {
    carrierName: input?.carrierName ?? RandomGenerator.name(2),
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(12),
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
