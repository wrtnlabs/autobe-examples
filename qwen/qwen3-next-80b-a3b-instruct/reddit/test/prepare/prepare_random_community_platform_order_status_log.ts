import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ICommunityPlatformOrderStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformOrderStatusLog";
export function prepare_random_community_platform_order_status_log(
  input?: DeepPartial<ICommunityPlatformOrderStatusLog.ICreate> | undefined,
): ICommunityPlatformOrderStatusLog.ICreate {
  return {
    status:
      input?.status ??
      RandomGenerator.pick([
        "pending",
        "confirmed",
        "shipped",
        "delivered",
        "completed",
        "cancelled",
      ] as const),
    comment:
      input?.comment ??
      RandomGenerator.paragraph({
        sentences: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        wordMin: 3,
        wordMax: 8,
      }),
  };
}
