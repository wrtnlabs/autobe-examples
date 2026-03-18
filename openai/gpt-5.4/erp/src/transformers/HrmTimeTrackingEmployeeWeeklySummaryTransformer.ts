import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeWeeklySummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeWeeklySummary";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmTimeTrackingEmployeeAtSummaryTransformer } from "./HrmTimeTrackingEmployeeAtSummaryTransformer";

export namespace HrmTimeTrackingEmployeeWeeklySummaryTransformer {
  export type Payload =
    Prisma.hrm_time_tracking_employee_weekly_summariesGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        employee: HrmTimeTrackingEmployeeAtSummaryTransformer.select(),
        week_start_date: true,
        week_end_date: true,
        total_minutes_logged: true,
        current_timesheet_status: true,
        active_timer_running: true,
        assigned_open_task_count: true,
        assigned_in_progress_task_count: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.hrm_time_tracking_employee_weekly_summariesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimeTrackingEmployeeWeeklySummary> {
    return {
      id: input.id,
      employee: await HrmTimeTrackingEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      total_minutes_logged: input.total_minutes_logged,
      current_timesheet_status: input.current_timesheet_status ?? null,
      active_timer_running: input.active_timer_running,
      assigned_open_task_count: input.assigned_open_task_count,
      assigned_in_progress_task_count: input.assigned_in_progress_task_count,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}
