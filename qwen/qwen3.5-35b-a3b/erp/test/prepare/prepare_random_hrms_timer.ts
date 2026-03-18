import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_timer(
  input?: DeepPartial<IHrmsTimer.ICreate>,
): IHrmsTimer.ICreate {
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id: input?.task_id ?? typia.random<string & tags.Format<"uuid">>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
