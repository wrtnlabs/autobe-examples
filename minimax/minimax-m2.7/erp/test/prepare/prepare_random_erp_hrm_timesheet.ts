import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_timesheet(
  input?: DeepPartial<IErpHrmTimesheet.ICreate>,
): IErpHrmTimesheet.ICreate {
  // Helper to generate a valid Monday date-time within the past 4 weeks
  const generateMondayDateTime = (): string => {
    const now = new Date();
    const currentDay = now.getDay();
    // Calculate offset to the preceding Monday: Mon=0, Tue=6, Wed=5, Thu=4, Fri=3, Sat=2, Sun=1
    const daysUntilPreviousMonday = (8 - currentDay) % 7;
    // Random offset within past 4 weeks
    const randomDaysBack = Math.floor(Math.random() * 28);
    const monday = new Date(now);
    monday.setDate(now.getDate() - randomDaysBack + daysUntilPreviousMonday);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  };
  return {
    weekStartDate: input?.weekStartDate ?? generateMondayDateTime(),
  };
}
