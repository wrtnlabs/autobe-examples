import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { PasswordUtil } from "../utils/PasswordUtil";

function toISOStringSafe(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") {
    // If already ISO-like, keep as-is; otherwise attempt parse.
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
    throw new Error("Invalid date string");
  }
  if (value == null) throw new Error("Date value is null or undefined");
  throw new Error("Unsupported date value");
}
export namespace ErpHrmTimeTrackingTimelogSnapshotCollector {
  export async function collect(props: {
    body: IErpHrmTimeTrackingTimelogSnapshot.ICreate;
  }) {
    const id: string = v4();
    const timelog =
      await MyGlobal.prisma.erp_hrm_time_tracking_timelogs.findFirstOrThrow({
        where: { id: props.body.erp_hrm_time_tracking_timelog_id },
        select: {
          erp_hrm_time_tracking_organization_id: true,
          erp_hrm_time_tracking_employee_id: true,
          erp_hrm_time_tracking_project_id: true,
        },
      });
    return {
      id,
      organization_id: timelog.erp_hrm_time_tracking_organization_id,
      employee_id: timelog.erp_hrm_time_tracking_employee_id,
      project_id: timelog.erp_hrm_time_tracking_project_id,
      task_id: props.body.task_id ?? null,
      timesheet_id: props.body.timesheet_id ?? null,
      started_at: toISOStringSafe(props.body.started_at),
      ended_at: toISOStringSafe(props.body.ended_at),
      duration_minutes: props.body.duration_minutes,
      work_description: props.body.work_description,
      source_timer_session_id: props.body.source_timer_session_id ?? null,
      workflow_status: props.body.workflow_status,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
      timelog: { connect: { id: props.body.erp_hrm_time_tracking_timelog_id } },
    } satisfies Prisma.erp_hrm_time_tracking_timelog_snapshotsCreateInput;
  }
}
