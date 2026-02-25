import { ICommunityPlatformMaintenanceWindow } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMaintenanceWindow";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_community_platform_maintenance_window(
  input?: DeepPartial<ICommunityPlatformMaintenanceWindow.ICreate>,
): ICommunityPlatformMaintenanceWindow.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    maintenance_type:
      input?.maintenance_type ??
      RandomGenerator.pick([
        "planned",
        "emergency",
        "security",
        "performance",
        "routine",
      ] as const),
    scheduled_start:
      input?.scheduled_start ??
      typia.random<string & tags.Format<"date-time">>(),
    scheduled_end:
      input?.scheduled_end ?? typia.random<string & tags.Format<"date-time">>(),
    notification_message:
      input?.notification_message ?? RandomGenerator.content({ paragraphs: 1 }),
    impact_level:
      input?.impact_level ??
      RandomGenerator.pick(["low", "medium", "high", "critical"] as const),
    affected_services:
      input?.affected_services ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
