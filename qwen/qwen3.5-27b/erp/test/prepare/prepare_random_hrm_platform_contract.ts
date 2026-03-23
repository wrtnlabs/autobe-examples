import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_contract(
  input?: DeepPartial<IHrmPlatformContract.ICreate> | undefined,
): IHrmPlatformContract.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    start_at:
      input?.start_at ?? typia.random<string & tags.Format<"date-time">>(),
    end_at:
      input?.end_at ??
      (Math.random() < 0.5
        ? null
        : typia.random<string & tags.Format<"date-time">>()),
    pay_rate:
      input?.pay_rate ??
      typia.random<number & tags.Minimum<1000> & tags.Maximum<50000>>(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      typia.random<number & tags.Minimum<20> & tags.Maximum<60>>(),
  };
}
