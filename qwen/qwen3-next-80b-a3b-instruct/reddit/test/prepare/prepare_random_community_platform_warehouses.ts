import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformWarehouses } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformWarehouses";
export function prepare_random_community_platform_warehouses(
  input?: DeepPartial<ICommunityPlatformWarehouses.ICreate>,
): ICommunityPlatformWarehouses.ICreate {
  return {
    name:
      input?.name ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 2,
        wordMax: 4,
      }),
    description:
      input?.description ??
        RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 3,
          sentenceMax: 5,
        }), // Removed the || null
    address:
      input?.address ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 3,
        wordMax: 6,
      }),
    capacity:
      input?.capacity ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    current_occupancy:
      input?.current_occupancy ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<0> & tags.Maximum<100000>
      >(),
    is_active: input?.is_active ?? RandomGenerator.pick([true, false] as const),
    warehouse_type:
      input?.warehouse_type ??
      RandomGenerator.pick([
        "distribution",
        "fulfillment",
        "storage",
        "crossdock",
      ] as const),
    security_level:
      input?.security_level ??
      RandomGenerator.pick(["standard", "high", "critical"] as const),
    lat:
      input?.lat ??
      typia.random<number & tags.Minimum<-90> & tags.Maximum<90>>(),
    lng:
      input?.lng ??
      typia.random<number & tags.Minimum<-180> & tags.Maximum<180>>(),
    size:
      input?.size ??
      RandomGenerator.pick(["small", "medium", "large", "enterprise"] as const),
    region:
      input?.region ??
      RandomGenerator.paragraph({
        sentences: 1,
        wordMin: 1,
        wordMax: 3,
      }),
    timezone:
      input?.timezone ??
      RandomGenerator.pick([
        "Asia/Seoul",
        "America/New_York",
        "Europe/London",
        "Australia/Sydney",
        "Pacific/Tahiti",
      ] as const),
    contact_email:
      input?.contact_email ?? typia.random<string & tags.Format<"email">>(),
    contact_phone: input?.contact_phone ?? RandomGenerator.mobile("+82"),
    carrier_integration_ids:
      input?.carrier_integration_ids ??
      ArrayUtil.repeat(
        typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        () => typia.random<string & tags.Format<"uuid">>(),
      ),
    temperature_control:
      input?.temperature_control ??
      RandomGenerator.pick([true, false] as const),
    humidity_control:
      input?.humidity_control ?? RandomGenerator.pick([true, false] as const),
  };
}