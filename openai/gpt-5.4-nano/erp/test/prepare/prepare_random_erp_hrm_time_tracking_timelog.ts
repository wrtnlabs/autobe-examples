import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_timelog(
  input?: DeepPartial<IErpHrmTimeTrackingTimelog.ICreate> | undefined,
): IErpHrmTimeTrackingTimelog.ICreate {
  return {
    work_date:
      input?.work_date ?? typia.random<string & tags.Format<"date-time">>(),
    start_time:
      input?.start_time !== undefined
        ? (input.start_time ?? null)
        : typia.random<string & tags.Format<"date-time">>(),
    end_time:
      input?.end_time !== undefined
        ? (input.end_time ?? null)
        : typia.random<string & tags.Format<"date-time">>(),
    duration_minutes:
      input?.duration_minutes ??
      typia.random<number & tags.Type<"int32"> & tags.Minimum<0>>(),
    note:
      input?.note !== undefined
        ? (input.note ?? null)
        : RandomGenerator.paragraph({ sentences: 2 }),
    erpHrmTimeTrackingProjectId:
      input?.erpHrmTimeTrackingProjectId ??
      typia.random<string & tags.Format<"uuid">>(),
    erpHrmTimeTrackingTaskId:
      input?.erpHrmTimeTrackingTaskId !== undefined
        ? (input.erpHrmTimeTrackingTaskId ?? null)
        : null,
    erpHrmTimeTrackingTimesheetId:
      input?.erpHrmTimeTrackingTimesheetId !== undefined
        ? (input.erpHrmTimeTrackingTimesheetId ?? null)
        : null,
  };
}
