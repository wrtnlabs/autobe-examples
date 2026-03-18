import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_project(
  input?: DeepPartial<IHrmTimeTrackingProject.ICreate>,
): IHrmTimeTrackingProject.ICreate {
  return (() => {
    const defaultStart = RandomGenerator.date(
      new Date(),
      1000 * 60 * 60 * 24 * 30,
    ).toISOString() as string & tags.Format<"date-time">;
    const defaultEnd = RandomGenerator.date(
      new Date(defaultStart),
      1000 * 60 * 60 * 24 * 90,
    ).toISOString() as string & tags.Format<"date-time">;
    return {
      name: input?.name ?? RandomGenerator.name(2),
      description:
        input?.description !== undefined
          ? input.description
          : RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 2,
              sentenceMax: 5,
            }),
      color_code:
        input?.color_code ??
        RandomGenerator.pick([
          "#EF4444",
          "#F59E0B",
          "#10B981",
          "#3B82F6",
          "#8B5CF6",
          "#EC4899",
        ] as const),
      status:
        input?.status ??
        RandomGenerator.pick([
          "planned",
          "active",
          "on_hold",
          "completed",
        ] as const),
      budget_hours:
        input?.budget_hours !== undefined
          ? input.budget_hours
          : typia.random<
              number &
                tags.Type<"uint32"> &
                tags.Minimum<1> &
                tags.Maximum<2000>
            >(),
      start_date:
        input?.start_date !== undefined ? input.start_date : defaultStart,
      end_date: input?.end_date !== undefined ? input.end_date : defaultEnd,
    };
  })();
}
