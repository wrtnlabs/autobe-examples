import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_platform_contract(
  input?: DeepPartial<IHrmPlatformContract.ICreate>,
): IHrmPlatformContract.ICreate {
  return {
    employee_id:
      input?.employee_id ?? typia.random<string & tags.Format<"uuid">>(),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    pay_rate:
      input?.pay_rate ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1000> & tags.Maximum<999999>
      >(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick([
        "weekly",
        "biweekly",
        "monthly",
        "annually",
      ] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<80>
      >(),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 2 }),
  };
}
