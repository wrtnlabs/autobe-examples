import { IDiscussionBoardMaintenanceSchedule } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMaintenanceSchedule";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_discussion_board_maintenance_schedule(
  input?: DeepPartial<IDiscussionBoardMaintenanceSchedule.ICreate> | undefined,
): IDiscussionBoardMaintenanceSchedule.ICreate {
  return {
    maintenance_type:
      input?.maintenance_type ??
      RandomGenerator.pick([
        "backup",
        "system_update",
        "database_maintenance",
        "security_patch",
        "performance_optimization",
      ] as const),
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    planned_start_at:
      input?.planned_start_at ??
      typia.random<string & tags.Format<"date-time">>(),
    planned_end_at:
      input?.planned_end_at ??
      (() => {
        // If start is provided, generate end after it
        if (input?.planned_start_at) {
          const start = new Date(input.planned_start_at);
          const end = new Date(
            start.getTime() +
              60 *
                60 *
                1000 *
                typia.random<
                  number &
                    tags.Type<"uint32"> &
                    tags.Minimum<1> &
                    tags.Maximum<24>
                >(),
          );
          return end.toISOString();
        }
        // Otherwise generate both dates with end after start
        const start = new Date(
          typia.random<string & tags.Format<"date-time">>(),
        );
        const end = new Date(
          start.getTime() +
            60 *
              60 *
              1000 *
              typia.random<
                number &
                  tags.Type<"uint32"> &
                  tags.Minimum<1> &
                  tags.Maximum<24>
              >(),
        );
        return end.toISOString();
      })(),
  };
}
