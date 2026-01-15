import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformShipmentNote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformShipmentNote";
export function prepare_random_community_platform_shipment_note(
  input?: DeepPartial<ICommunityPlatformShipmentNote.ICreate>,
): ICommunityPlatformShipmentNote.ICreate {
  return {
    content:
      input?.content ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<10>
        >(),
      }),
  };
}
