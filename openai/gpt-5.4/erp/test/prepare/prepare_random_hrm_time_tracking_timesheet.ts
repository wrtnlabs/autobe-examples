import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_hrm_time_tracking_timesheet(
  input?: DeepPartial<IHrmTimeTrackingTimesheet.ICreate>,
): IHrmTimeTrackingTimesheet.ICreate {
  return {
    week_start_date:
      input?.week_start_date ??
      (() => {
        const now = new Date();
        const day = now.getUTCDay();
        const diff = day === 0 ? -6 : 1 - day;
        const monday = new Date(
          Date.UTC(
            now.getUTCFullYear(),
            now.getUTCMonth(),
            now.getUTCDate() + diff,
            0,
            0,
            0,
            0,
          ),
        );
        return monday.toISOString();
      })(),
  };
}
