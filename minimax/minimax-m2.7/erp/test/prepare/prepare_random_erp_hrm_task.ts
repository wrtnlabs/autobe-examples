import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_task(
  input?: DeepPartial<IErpHrmTask.ICreate>,
): IErpHrmTask.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.alphabets(
        typia.random<number & tags.Minimum<1> & tags.Maximum<50>>(),
      ),
    description:
      input?.description ?? RandomGenerator.content({ paragraphs: 2 }),
    estimatedHours:
      input?.estimatedHours ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<200>
      >(),
    dueDate:
      input?.dueDate ?? typia.random<string & tags.Format<"date-time">>(),
    erpHrmEmployeeId:
      input?.erpHrmEmployeeId ?? typia.random<string & tags.Format<"uuid">>(),
    parentId: input?.parentId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
