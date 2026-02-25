import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_maintenance_schedule(
  input?: DeepPartial<IDiscussionBoardMaintenanceSchedule.ICreate>,
): IDiscussionBoardMaintenanceSchedule.ICreate {
  return {
    maintenance_type:
      input?.maintenance_type ??
      RandomGenerator.pick([
        "System Update",
        "Database Backup",
        "Security Patch",
        "Performance Optimization",
        "Hardware Maintenance",
        "Software Upgrade",
      ] as const),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 8,
      }),
    scheduled_start_time:
      input?.scheduled_start_time ??
      typia.random<string & tags.Format<"date-time">>(),
    scheduled_end_time:
      input?.scheduled_end_time ??
      (() => {
        const start = new Date(
          input?.scheduled_start_time ??
            typia.random<string & tags.Format<"date-time">>(),
        );
        const duration =
          input?.estimated_duration_minutes ??
          typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
          >();
        start.setMinutes(start.getMinutes() + duration);
        return start.toISOString();
      })(),
    estimated_duration_minutes:
      input?.estimated_duration_minutes ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<480>
      >(),
    impact_level:
      input?.impact_level ??
      RandomGenerator.pick(["low", "medium", "high", "critical"] as const),
    status:
      input?.status ??
      RandomGenerator.pick([
        "scheduled",
        "in-progress",
        "completed",
        "cancelled",
      ] as const),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
