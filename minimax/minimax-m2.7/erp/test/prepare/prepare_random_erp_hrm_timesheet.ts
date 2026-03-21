import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_timesheet(
  input?: DeepPartial<IErpHrmTimesheet.ICreate>,
): IErpHrmTimesheet.ICreate {
  // Get a Monday for week_start_date
  const now = new Date();
  const dayOfWeek = now.getUTCDay();
  // Days since Monday (0=Mon, 1=Tue, ..., 6=Sun)
  // To get previous Monday: subtract (dayOfWeek + 6) % 7 days
  const daysToSubtract = (dayOfWeek + 6) % 7;
  const monday = new Date(now.getTime() - daysToSubtract * 24 * 60 * 60 * 1000);
  monday.setUTCHours(0, 0, 0, 0);
  const weekStartDate = input?.week_start_date ?? monday.toISOString();
  // Calculate week_end_date as start + 6 days (Sunday)
  const startDate = new Date(weekStartDate);
  const sunday = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
  sunday.setUTCHours(23, 59, 59, 999);
  const weekEndDate = input?.week_end_date ?? sunday.toISOString();
  return {
    week_start_date: weekStartDate,
    week_end_date: weekEndDate,
  };
}
