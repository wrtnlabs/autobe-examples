import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_employee_contract(
  input?: DeepPartial<IHrmTimeTrackingEmployeeContract.ICreate>,
): IHrmTimeTrackingEmployeeContract.ICreate {
  return {
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date !== undefined
        ? input.end_date
        : typia.random<string & tags.Format<"date-time">>(),
    pay_rate: input?.pay_rate ?? typia.random<number>(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick([
        "hourly",
        "weekly",
        "biweekly",
        "monthly",
        "annually",
      ] as const),
    working_hours_per_week:
      input?.working_hours_per_week ?? typia.random<number>(),
    notes:
      input?.notes !== undefined
        ? input.notes
        : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
