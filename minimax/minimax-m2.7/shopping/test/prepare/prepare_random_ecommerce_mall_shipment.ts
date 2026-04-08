import { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce mall shipment creation data for E2E testing.
 *
 * Generates a complete IEcommerceMallShipment.ICreate with randomized values for
 * shipment creation. The orderId is optional as it can be derived from the itemId
 * path parameter when using /sellers/me/orders/items/{itemId}/ship endpoint.
 *
 * @param input Optional DeepPartial values to override generated defaults
 * @returns Complete shipment creation data
 */
export function prepare_random_ecommerce_mall_shipment(
  input?: DeepPartial<IEcommerceMallShipment.ICreate>,
): IEcommerceMallShipment.ICreate {
  const carriers = [
    "DHL",
    "FedEx",
    "UPS",
    "USPS",
    "Korea Post",
    "CJ Logistics",
    "Lotte Global Logis",
  ] as const;
  return {
    orderId: input?.orderId ?? typia.random<string & tags.Format<"uuid">>(),
    carrier: input?.carrier ?? RandomGenerator.pick(carriers),
    trackingNumber: input?.trackingNumber ?? RandomGenerator.alphaNumeric(18),
    itemIds: input?.itemIds
      ? input.itemIds.map(
          (itemId) => itemId ?? typia.random<string & tags.Format<"uuid">>(),
        )
      : ArrayUtil.repeat(
          typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
          >(),
          () => typia.random<string & tags.Format<"uuid">>(),
        ),
  };
}
