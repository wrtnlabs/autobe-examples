import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimesheet";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator } from "@nestia/e2e";
import { randint } from "tstl";
import typia, { tags } from "typia";

export function prepare_random_erp_hrm_time_tracking_timesheet(
  input?: DeepPartial<IErpHrmTimeTrackingTimesheet.ICreate> | undefined,
): IErpHrmTimeTrackingTimesheet.ICreate {
  const status =
    input?.status ??
    RandomGenerator.pick([
      "draft",
      "submitted",
      "approved",
      "rejected",
    ] as const);
  const weekStart =
    input?.week_start_at ??
    RandomGenerator.date(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      7 * 24 * 60 * 60 * 1000,
    ).toISOString();
  const weekEnd =
    input?.week_end_at ??
    new Date(
      new Date(weekStart).getTime() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
  const submitted_at =
    input?.submitted_at !== undefined
      ? input.submitted_at
      : status === "submitted" || status === "approved" || status === "rejected"
        ? RandomGenerator.date(
            new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            3 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null;
  const approved_at =
    input?.approved_at !== undefined
      ? input.approved_at
      : status === "approved"
        ? RandomGenerator.date(
            new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            2 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null;
  const rejected_at =
    input?.rejected_at !== undefined
      ? input.rejected_at
      : status === "rejected"
        ? RandomGenerator.date(
            new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
            2 * 24 * 60 * 60 * 1000,
          ).toISOString()
        : null;
  return {
    week_start_at: weekStart,
    week_end_at: weekEnd,
    status,
    erp_hrm_time_tracking_employee_id:
      input?.erp_hrm_time_tracking_employee_id ??
      typia.random<string & tags.Format<"uuid">>(),
    submitted_at,
    approved_at,
    rejected_at,
  };
}
