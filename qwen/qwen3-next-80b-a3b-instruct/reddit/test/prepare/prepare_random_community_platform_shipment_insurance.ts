import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformShipmentInsurance } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentInsurance";
export function prepare_random_community_platform_shipment_insurance(
  input?: DeepPartial<ICommunityPlatformShipmentInsurance.ICreate>,
): ICommunityPlatformShipmentInsurance.ICreate {
  return {
    // Test-customizable: maximum coverage amount (non-negative)
    coverage_limit:
      input?.coverage_limit ??
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
    // Test-customizable: insurance premium amount (non-negative)
    premium_amount:
      input?.premium_amount ??
      typia.random<number & tags.Type<"uint32"> & tags.Minimum<0>>(),
    // Test-customizable: policy number (non-empty, max 100 chars)
    policy_number:
      input?.policy_number ??
      RandomGenerator.alphaNumeric(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      ),
    // Test-customizable: start date (ISO date-time, must be today or future)
    start_date:
      input?.start_date ??
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    // Test-customizable: end date (ISO date-time, must be after start_date)
    // Use start_date if provided, else generate future start_date and add 1-30 days
    end_date:
      input?.end_date ??
      new Date(
        new Date(
          input?.start_date ?? new Date(Date.now() + 24 * 60 * 60 * 1000),
        ).getTime() +
          typia.random<
            number &
              tags.Type<"uint32"> &
              tags.Minimum<86400000> &
              tags.Maximum<2592000000>
          >(),
      ).toISOString(),
  };
}
