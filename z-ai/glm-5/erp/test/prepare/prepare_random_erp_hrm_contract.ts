import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_contract(
  input?: DeepPartial<IErpHrmContract.ICreate>,
): IErpHrmContract.ICreate {
  return {
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date: input?.end_date !== undefined ? input.end_date : null,
    pay_rate:
      input?.pay_rate ??
      typia.random<number & tags.ExclusiveMinimum<0> & tags.Maximum<1000000>>(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<60>
      >(),
    notes: input?.notes !== undefined ? input.notes : null,
  };
}
