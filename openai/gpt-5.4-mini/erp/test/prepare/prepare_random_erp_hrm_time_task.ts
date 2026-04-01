import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_task(
  input?: DeepPartial<IErpHrmTimeTask.ICreate> | undefined,
): IErpHrmTimeTask.ICreate {
  return {
    title: input?.title ?? RandomGenerator.paragraph({ sentences: 3 }),
    description:
      input?.description !== undefined
        ? input.description
        : RandomGenerator.content({ paragraphs: 1 }),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    estimatedHours:
      input?.estimatedHours ??
      typia.random<
        number & tags.Type<"double"> & tags.Minimum<0.5> & tags.Maximum<40>
      >(),
    dueDate:
      input?.dueDate !== undefined
        ? input.dueDate
        : typia.random<string & tags.Format<"date-time">>(),
    employeeId:
      input?.employeeId !== undefined
        ? input.employeeId
        : typia.random<string & tags.Format<"uuid">>(),
    parentTaskId:
      input?.parentTaskId !== undefined
        ? input.parentTaskId
        : typia.random<string & tags.Format<"uuid">>(),
  };
}
