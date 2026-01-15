import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformShipmentAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentAddress";
export function prepare_random_community_platform_shipment_address(
  input?: DeepPartial<ICommunityPlatformShipmentAddress.ICreate> | undefined,
): ICommunityPlatformShipmentAddress.ICreate {
  return {
    street_address:
      input?.street_address ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 8,
      }).replace(/\n/g, " "),
    city: input?.city ?? RandomGenerator.name(1),
    state_province:
      input?.state_province ??
      RandomGenerator.pick([
        "AL",
        "AK",
        "AZ",
        "AR",
        "CA",
        "CO",
        "CT",
        "DE",
        "FL",
        "GA",
        "HI",
        "ID",
        "IL",
        "IN",
        "IA",
        "KS",
        "KY",
        "LA",
        "ME",
        "MD",
        "MA",
        "MI",
        "MN",
        "MS",
        "MO",
        "MT",
        "NE",
        "NV",
        "NH",
        "NJ",
        "NM",
        "NY",
        "NC",
        "ND",
        "OH",
        "OK",
        "OR",
        "PA",
        "RI",
        "SC",
        "SD",
        "TN",
        "TX",
        "UT",
        "VT",
        "VA",
        "WA",
        "WV",
        "WI",
        "WY",
      ] as const),
    postal_code:
      input?.postal_code ?? typia.random<string & tags.Pattern<"^[0-9]{5}$">>(),
    country:
      input?.country ??
      RandomGenerator.pick([
        "US",
        "CA",
        "GB",
        "DE",
        "JP",
        "AU",
        "FR",
        "MX",
        "BR",
        "CN",
      ] as const),
  };
}
