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
    endDate:
      input?.endDate !== undefined
        ? input.endDate
        : Math.random() > 0.5
          ? typia.random<string & tags.Format<"date-time">>()
          : null,
    notes:
      input?.notes !== undefined
        ? input.notes
        : Math.random() > 0.5
          ? RandomGenerator.content({ paragraphs: 1 })
          : null,
    payPeriod:
      input?.payPeriod ??
      RandomGenerator.pick(["hourly", "daily", "weekly", "monthly"] as const),
    payRate: input?.payRate ?? typia.random<number & tags.Minimum<0>>(),
    startDate:
      input?.startDate ?? typia.random<string & tags.Format<"date-time">>(),
    workingHoursPerWeek:
      input?.workingHoursPerWeek ?? typia.random<number & tags.Minimum<0>>(),
  };
}
