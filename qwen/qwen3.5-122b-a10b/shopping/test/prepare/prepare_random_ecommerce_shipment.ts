import { IEcommerceShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Prepare random ecommerce shipment creation data for E2E testing.
 *
 * Generates a complete IEcommerceShipment.ICreate with randomized values including
 * carrier information, tracking details, and order item references.
 *
 * @param input Optional partial input to override specific properties
 * @returns Complete shipment creation data
 */
export function prepare_random_ecommerce_shipment(
  input?: DeepPartial<IEcommerceShipment.ICreate>,
): IEcommerceShipment.ICreate {
  return {
    carrier_name:
      input?.carrier_name ??
      RandomGenerator.pick([
        "UPS",
        "FedEx",
        "USPS",
        "DHL",
        "China Post",
      ] as const),
    tracking_number: input?.tracking_number ?? RandomGenerator.alphaNumeric(12),
    tracking_url:
      input?.tracking_url ?? typia.random<string & tags.Format<"uri">>(),
    order_item_ids:
      input?.order_item_ids ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => typia.random<string & tags.Format<"uuid">>(),
      ),
  };
}
