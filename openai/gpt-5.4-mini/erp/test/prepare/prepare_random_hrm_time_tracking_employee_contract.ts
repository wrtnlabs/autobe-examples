import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_employee_contract(
  input?: DeepPartial<IHrmTimeTrackingEmployeeContract.ICreate> | undefined,
): IHrmTimeTrackingEmployeeContract.ICreate {
  return {
    startDate:
      input?.startDate ?? typia.random<string & tags.Format<"date-time">>(),
    endDate:
      input?.endDate !== undefined
        ? input.endDate
        : RandomGenerator.pick([
            null,
            typia.random<string & tags.Format<"date-time">>(),
          ] as const),
    payRate: input?.payRate ?? typia.random<number>(),
    payPeriod:
      input?.payPeriod ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    workingHoursPerWeek: input?.workingHoursPerWeek ?? typia.random<number>(),
    notes:
      input?.notes !== undefined
        ? input.notes
        : RandomGenerator.pick([
            null,
            RandomGenerator.paragraph({ sentences: 2 }),
          ] as const),
  };
}
