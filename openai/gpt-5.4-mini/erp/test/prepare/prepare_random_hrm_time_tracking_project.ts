import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_project(
  input?: DeepPartial<IHrmTimeTrackingProject.ICreate> | undefined,
): IHrmTimeTrackingProject.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description: input?.description ?? null,
    colorCode: input?.colorCode ?? `#${RandomGenerator.alphabets(6)}`,
    status:
      input?.status ??
      RandomGenerator.pick(["active", "archived", "completed"] as const),
    budgetHours: input?.budgetHours ?? null,
    startDate: input?.startDate ?? null,
    endDate: input?.endDate ?? null,
  };
}
