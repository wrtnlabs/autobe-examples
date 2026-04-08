import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_timesheet_timelog(
  input?: DeepPartial<IErpHrmTimeTimesheetTimelog.ICreate>,
): IErpHrmTimeTimesheetTimelog.ICreate {
  return {
    timelogId: input?.timelogId ?? typia.random<string & tags.Format<"uuid">>(),
  };
}
