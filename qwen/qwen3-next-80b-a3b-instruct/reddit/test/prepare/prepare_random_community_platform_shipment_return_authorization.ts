import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformShipmentReturnAuthorization } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentReturnAuthorization";
export function prepare_random_community_platform_shipment_return_authorization(
  input?: DeepPartial<ICommunityPlatformShipmentReturnAuthorization.ICreate>,
): ICommunityPlatformShipmentReturnAuthorization.ICreate {
  return {
    shipmentId:
      input?.shipmentId ?? typia.random<string & tags.Format<"uuid">>(),
    reason:
      input?.reason ??
      RandomGenerator.pick([
        "damaged",
        "wrong_item",
        "no_longer_needed",
        "ordered_by_mistake",
      ] as const),
    comments:
      input?.comments ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<2> & tags.Maximum<4>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
