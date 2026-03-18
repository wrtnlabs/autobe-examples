import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingContract";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_contract(
  input?: DeepPartial<IErpHrmTimeTrackingContract.ICreate> | undefined,
): IErpHrmTimeTrackingContract.ICreate {
  return {
    contract_number: input?.contract_number ?? RandomGenerator.alphaNumeric(12),
    contract_title:
      input?.contract_title ?? RandomGenerator.paragraph({ sentences: 2 }),
    pay_amount:
      input?.pay_amount ??
      typia.random<
        number & tags.Type<"uint32"> & tags.Minimum<1> & tags.Maximum<100000000>
      >(),
    pay_currency:
      input?.pay_currency ??
      RandomGenerator.pick(["USD", "EUR", "KRW", "JPY", "GBP", "CNY"] as const),
    pay_frequency:
      input?.pay_frequency ??
      RandomGenerator.pick([
        "monthly",
        "biweekly",
        "weekly",
        "semi-monthly",
      ] as const),
    work_term_start_date:
      input?.work_term_start_date ??
      typia.random<string & tags.Format<"date-time">>(),
    work_term_end_date:
      input?.work_term_end_date === undefined
        ? null
        : (input?.work_term_end_date ?? null),
    notes: input?.notes === undefined ? null : (input?.notes ?? null),
    status:
      input?.status ??
      RandomGenerator.pick(["active", "ended", "draft", "pending"] as const),
  };
}
