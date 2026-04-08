import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_timesheet(
  input?: DeepPartial<IErpHrmTimeTimesheet.ICreate> | undefined,
): IErpHrmTimeTimesheet.ICreate {
  const now: Date = new Date();
  const monday: Date = new Date(now);
  monday.setUTCDate(now.getUTCDate() - ((now.getUTCDay() + 6) % 7));
  monday.setUTCHours(0, 0, 0, 0);
  const sunday: Date = new Date(monday);
  sunday.setUTCDate(monday.getUTCDate() + 6);
  sunday.setUTCHours(23, 59, 59, 999);
  return {
    weekStartDate: input?.weekStartDate ?? monday.toISOString(),
    weekEndDate: input?.weekEndDate ?? sunday.toISOString(),
  };
}
