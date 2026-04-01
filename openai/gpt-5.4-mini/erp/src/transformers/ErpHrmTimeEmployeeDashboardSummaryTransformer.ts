import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeEmployeeAtSummaryTransformer } from "./ErpHrmTimeEmployeeAtSummaryTransformer";

export namespace ErpHrmTimeEmployeeDashboardSummaryTransformer {
  export type Payload =
    Prisma.erp_hrm_time_employee_dashboard_summariesGetPayload<
      ReturnType<typeof select>
    >;
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeEmployeeDashboardSummary> {
    return {
      id: input.id,
      employee: await ErpHrmTimeEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      hoursLoggedToday: input.hours_logged_today,
      hoursLoggedThisWeek: input.hours_logged_this_week,
      hasActiveTimer: input.has_active_timer,
      activeTimerStartedAt:
        input.active_timer_started_at?.toISOString() ?? null,
      recentTimelogCount: input.recent_timelog_count,
      pendingTimesheetStatus: input.pending_timesheet_status,
      recentTimelogSnapshotAt: input.recent_timelog_snapshot_at.toISOString(),
      assignedOpenTaskCount: input.assigned_open_task_count,
      assignedInProgressTaskCount: input.assigned_in_progress_task_count,
      snapshotAt: input.snapshot_at.toISOString(),
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
  export function select() {
    return {
      select: {
        id: true,
        hours_logged_today: true,
        hours_logged_this_week: true,
        has_active_timer: true,
        active_timer_started_at: true,
        recent_timelog_count: true,
        pending_timesheet_status: true,
        recent_timelog_snapshot_at: true,
        assigned_open_task_count: true,
        assigned_in_progress_task_count: true,
        snapshot_at: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: ErpHrmTimeEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_time_employee_dashboard_summariesFindManyArgs;
  }
}
