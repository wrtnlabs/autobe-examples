import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_employee(
  input?: DeepPartial<IHrmTimeTrackingEmployee.ICreate> | undefined,
): IHrmTimeTrackingEmployee.ICreate {
  return {
    userAccountId:
      input?.userAccountId ?? typia.random<string & tags.Format<"uuid">>(),
    roleId: input?.roleId ?? typia.random<string & tags.Format<"uuid">>(),
    departmentId:
      input?.departmentId === undefined
        ? typia.random<string & tags.Format<"uuid">>()
        : input.departmentId,
    positionTitle:
      input?.positionTitle === undefined
        ? RandomGenerator.name(2)
        : input.positionTitle,
    employmentType:
      input?.employmentType ??
      RandomGenerator.pick([
        "full-time",
        "part-time",
        "contractor",
        "intern",
      ] as const),
    status:
      input?.status ?? RandomGenerator.pick(["active", "pending"] as const),
  };
}
