import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformShipmentCost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentCost";
export function prepare_random_community_platform_shipment_cost(
  input?: DeepPartial<ICommunityPlatformShipmentCost.ICreate>,
): ICommunityPlatformShipmentCost.ICreate {
  return {
    cost_type:
      input?.cost_type ??
      RandomGenerator.pick([
        "carrier_fee",
        "insurance_premium",
        "fuel_surcharge",
        "customs_duty",
        "handling_charge",
        "other_additional_fee",
      ] as const),
    amount:
      input?.amount ??
      typia.random<
        number & tags.Minimum<0> & tags.Type<"uint32"> & tags.Maximum<999999>
      >(),
    currency: "USD",
    description:
      input?.description ??
        RandomGenerator.paragraph({
          sentences: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
          wordMin: 5,
          wordMax: 15,
        }),
  };
}