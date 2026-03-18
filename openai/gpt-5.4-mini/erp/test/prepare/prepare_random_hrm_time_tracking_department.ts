import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_department(
  input?: DeepPartial<IHrmTimeTrackingDepartment.ICreate> | undefined,
): IHrmTimeTrackingDepartment.ICreate {
  return {
    name: input?.name ?? RandomGenerator.name(2),
    description: input?.description ?? null,
    parentDepartmentId: input?.parentDepartmentId ?? null,
  };
}
