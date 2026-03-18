import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_employee_contract(
  input?: DeepPartial<IErpHrmEmployeeContract.ICreate> | undefined,
): IErpHrmEmployeeContract.ICreate {
  return {
    payRate:
      input?.payRate ??
      typia.random<
        number &
          tags.Type<"double"> &
          tags.ExclusiveMinimum<0> &
          tags.Maximum<500000>
      >(),
    payPeriod:
      input?.payPeriod ??
      RandomGenerator.pick([
        "hourly",
        "daily",
        "weekly",
        "bi_weekly",
        "monthly",
        "annually",
      ] as const),
    workingHoursPerWeek:
      input?.workingHoursPerWeek ??
      typia.random<
        number &
          tags.Type<"double"> &
          tags.ExclusiveMinimum<0> &
          tags.Maximum<80>
      >(),
    startDate:
      input?.startDate ?? typia.random<string & tags.Format<"date-time">>(),
    endDate: input?.endDate !== undefined ? input.endDate : null,
    notes: input?.notes !== undefined ? input.notes : null,
  };
}
