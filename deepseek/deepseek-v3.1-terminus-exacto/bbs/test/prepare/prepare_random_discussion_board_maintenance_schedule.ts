import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_maintenance_schedule(
  input?: DeepPartial<IDiscussionBoardMaintenanceSchedule.ICreate>,
): IDiscussionBoardMaintenanceSchedule.ICreate {
  const startTime =
    input?.scheduled_start_time ??
    RandomGenerator.date(
      new Date(Date.now() + 86400000),
      604800000,
    ).toISOString();
  const durationMinutes =
    input?.estimated_duration_minutes ??
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<60> & tags.Maximum<360>
    >();
  const endTime =
    input?.scheduled_end_time ??
    new Date(
      new Date(startTime).getTime() + durationMinutes * 60000,
    ).toISOString();
  return {
    maintenance_type:
      input?.maintenance_type ??
      RandomGenerator.pick([
        "system update",
        "database backup",
        "security patch",
        "infrastructure maintenance",
        "performance optimization",
      ] as const),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 6,
      }),
    scheduled_start_time: startTime,
    scheduled_end_time: endTime,
    estimated_duration_minutes: durationMinutes,
    impact_level:
      input?.impact_level ??
      RandomGenerator.pick(["low", "medium", "high", "critical"] as const),
    notes:
      input?.notes ??
      RandomGenerator.pick([
        RandomGenerator.paragraph({ sentences: 2 }),
        null,
      ] as const),
  };
}
