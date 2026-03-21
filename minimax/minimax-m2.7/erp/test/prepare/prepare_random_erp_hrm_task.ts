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
    title: (input?.title ??
      RandomGenerator.paragraph({ sentences: 1 })) as string &
      tags.MaxLength<255>,
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    status: input?.status,
    description:
      input?.description === null
        ? null
        : (input?.description ?? RandomGenerator.content({ paragraphs: 1 })),
    erp_hrm_employee_id:
      input?.erp_hrm_employee_id === null
        ? null
        : (input?.erp_hrm_employee_id ??
          typia.random<string & tags.Format<"uuid">>()),
    estimated_hours:
      input?.estimated_hours === null
        ? null
        : (input?.estimated_hours ?? typia.random<number & tags.Minimum<0>>()),
    due_date:
      input?.due_date === null
        ? null
        : (input?.due_date ??
          typia.random<string & tags.Format<"date-time">>()),
    parent_id:
      input?.parent_id === null
        ? null
        : (input?.parent_id ?? typia.random<string & tags.Format<"uuid">>()),
  };
}
