import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrms_employee_contract(
  input?: DeepPartial<IHrmsEmployeeContract.ICreate>,
): IHrmsEmployeeContract.ICreate {
  return {
    start_date:
      input?.start_date ??
      RandomGenerator.date(new Date(), 90 * 24 * 60 * 60 * 1000).toISOString(),
    pay_rate:
      input?.pay_rate ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
