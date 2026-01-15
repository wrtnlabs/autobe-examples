import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformShipmentTracking } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentTracking";
import { ICoordinates } from "@ORGANIZATION/PROJECT-api/lib/structures/ICoordinates";
export function prepare_random_community_platform_shipment_tracking(
  input?: DeepPartial<ICommunityPlatformShipmentTracking.ICreate>,
): ICommunityPlatformShipmentTracking.ICreate {
  return {
    status: RandomGenerator.pick([
      "pending_pickup",
      "shipped",
      "in_transit",
      "customs",
      "out_for_delivery",
      "attempted",
      "delivered",
      "returned",
      "cancelled",
    ] as const),
    location:
      input?.location ??
      `${RandomGenerator.alphabets(3)}${RandomGenerator.alphaNumeric(3)}`,
    notes:
      input?.notes ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<2>
        >(),
      }),
    tracking_code:
      input?.tracking_code ??
      `TRACK-20260111-${RandomGenerator.alphaNumeric(4)}`,
    event_time: input?.event_time ?? new Date().toISOString(),
    coordinates:
      input?.coordinates ??
      `${RandomGenerator.alphaNumeric(8)},${RandomGenerator.alphaNumeric(8)}`,
    coordinates_unit: "latitude_longitude",
    coordinates_system: "WGS84",
  };
}
