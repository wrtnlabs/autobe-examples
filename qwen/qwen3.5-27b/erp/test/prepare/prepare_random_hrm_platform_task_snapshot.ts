import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTaskSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTaskSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_task_snapshot(
  input?: DeepPartial<IHrmPlatformTaskSnapshot.ICreate>,
): IHrmPlatformTaskSnapshot.ICreate {
  return {
    hrm_platform_task_id:
      input?.hrm_platform_task_id ??
      typia.random<string & tags.Format<"uuid">>(),
  };
}
