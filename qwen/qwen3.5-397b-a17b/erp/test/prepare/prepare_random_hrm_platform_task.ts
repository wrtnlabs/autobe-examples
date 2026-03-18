import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_task(
  input?: DeepPartial<IHrmPlatformTask.ICreate>,
): IHrmPlatformTask.ICreate {
  return {
    title:
      input?.title ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 3, wordMax: 8 }),
    description:
      input?.description ??
      RandomGenerator.content({
        paragraphs: 2,
        sentenceMin: 3,
        sentenceMax: 5,
      }),
    status:
      input?.status ??
      RandomGenerator.pick([
        "open",
        "in-progress",
        "completed",
        "closed",
      ] as const),
    priority:
      input?.priority ??
      RandomGenerator.pick(["low", "medium", "high", "urgent"] as const),
    estimated_hours:
      input?.estimated_hours ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100>
      >(),
    due_date:
      input?.due_date ?? typia.random<string & tags.Format<"date-time">>(),
    hrm_platform_employee_id:
      input?.hrm_platform_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    parent_id: input?.parent_id ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
