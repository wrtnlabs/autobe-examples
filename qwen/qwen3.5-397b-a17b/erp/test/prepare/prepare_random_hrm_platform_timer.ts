import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_timer(
  input?: DeepPartial<IHrmPlatformTimer.ICreate>,
): IHrmPlatformTimer.ICreate {
  return {
    project_id:
      input?.project_id ?? typia.random<string & tags.Format<"uuid">>(),
    task_id:
      input?.task_id ?? typia.random<(string & tags.Format<"uuid">) | null>(),
    description:
      input?.description ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
