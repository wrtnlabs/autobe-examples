import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_project(
  input?: DeepPartial<IErpHrmProject.ICreate> | undefined,
): IErpHrmProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(),
    color:
      input?.color ??
      RandomGenerator.pick([
        "#FF5733",
        "#33FF57",
        "#3357FF",
        "#FF33A8",
        "#A833FF",
        "#33FFF5",
        "#FF8C33",
        "#8CFF33",
        "#338CFF",
        "#FF3333",
      ] as const),
    description:
      input?.description !== undefined
        ? (input.description ?? null)
        : RandomGenerator.content({ paragraphs: 1 }),
    budget_hours:
      input?.budget_hours !== undefined
        ? (input.budget_hours ?? null)
        : typia.random<
            number &
              tags.Type<"double"> &
              tags.ExclusiveMinimum<0> &
              tags.Maximum<10000>
          >(),
    started_at:
      input?.started_at !== undefined
        ? (input.started_at ?? null)
        : typia.random<string & tags.Format<"date-time">>(),
    ended_at:
      input?.ended_at !== undefined
        ? (input.ended_at ?? null)
        : typia.random<string & tags.Format<"date-time">>(),
  };
}
