import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployeeContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_employee_contract(
  input?: DeepPartial<IHrmPlatformEmployeeContract.ICreate>,
): IHrmPlatformEmployeeContract.ICreate {
  return {
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date:
      input?.end_date !== undefined
        ? input.end_date
        : typia.random<boolean>()
          ? null
          : typia.random<string & tags.Format<"date-time">>(),
    pay_rate:
      input?.pay_rate ??
      typia.random<
        number & tags.Type<"double"> & tags.Minimum<1000> & tags.Maximum<100000>
      >(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<20> & tags.Maximum<60>
      >(),
    notes:
      input?.notes !== undefined
        ? input.notes
        : typia.random<boolean>()
          ? null
          : RandomGenerator.paragraph({ sentences: 2 }),
  };
}
