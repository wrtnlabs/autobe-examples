import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerSystemConfig } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerSystemConfig";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_tracker_system_config(
  input?: DeepPartial<IHrmTrackerSystemConfig.ICreate>,
): IHrmTrackerSystemConfig.ICreate {
  return {
    key: input?.key ?? RandomGenerator.name(1),
    value:
      input?.value ??
      RandomGenerator.paragraph({ sentences: 2, wordMin: 5, wordMax: 10 }),
  };
}
