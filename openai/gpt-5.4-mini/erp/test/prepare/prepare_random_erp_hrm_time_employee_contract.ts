import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_employee_contract(
  input?: DeepPartial<IErpHrmTimeEmployeeContract.ICreate> | undefined,
): IErpHrmTimeEmployeeContract.ICreate {
  return {
    startDate:
      input?.startDate ?? typia.random<string & tags.Format<"date-time">>(),
    endDate: input?.endDate !== undefined ? input.endDate : null,
    payRate:
      input?.payRate ??
      typia.random<number & tags.Type<"double"> & tags.Minimum<0.01>>(),
    payPeriod:
      input?.payPeriod ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    workingHoursPerWeek:
      input?.workingHoursPerWeek ?? typia.random<number & tags.Type<"int32">>(),
    notes: input?.notes !== undefined ? input.notes : null,
  };
}
