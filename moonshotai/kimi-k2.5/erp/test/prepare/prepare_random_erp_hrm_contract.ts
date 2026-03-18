import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_contract(
  input?: DeepPartial<IErpHrmContract.ICreate> | undefined,
): IErpHrmContract.ICreate {
  return {
    organization_member_id:
      input?.organization_member_id ??
      typia.random<string & tags.Format<"uuid">>(),
    employment_type:
      input?.employment_type ??
      RandomGenerator.pick(["full-time", "part-time", "contract"] as const),
    start_date:
      input?.start_date ?? typia.random<string & tags.Format<"date-time">>(),
    end_date: input?.end_date ?? null,
    pay_rate:
      input?.pay_rate ??
      typia.random<number & tags.Minimum<0> & tags.Maximum<100000>>(),
    pay_period:
      input?.pay_period ??
      RandomGenerator.pick([
        "hourly",
        "daily",
        "weekly",
        "bi-weekly",
        "monthly",
      ] as const),
    working_hours_per_week:
      input?.working_hours_per_week ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<168>
      >(),
    notes: input?.notes ?? RandomGenerator.paragraph({ sentences: 3 }),
  };
}
