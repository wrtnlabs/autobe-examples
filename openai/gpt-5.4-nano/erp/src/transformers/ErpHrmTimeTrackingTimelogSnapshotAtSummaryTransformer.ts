import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import typia, { tags } from "typia";

import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingTimelogSnapshotAtSummaryTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_timelog_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
        erp_hrm_time_tracking_timelog_id: true,
        organization_id: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        timesheet_id: true,
        started_at: true,
        ended_at: true,
        duration_minutes: true,
        work_description: true,
        source_timer_session_id: true,
        workflow_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    } satisfies Prisma.erp_hrm_time_tracking_timelog_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimelogSnapshot.ISummary> {
    return {
      id: input.id,
      erp_hrm_time_tracking_timelog_id: input.erp_hrm_time_tracking_timelog_id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
      project_id: input.project_id,
      task_id: input.task_id ?? null,
      timesheet_id: input.timesheet_id ?? null,
      started_at: input.started_at.toISOString(),
      ended_at: input.ended_at.toISOString(),
      duration_minutes: input.duration_minutes,
      work_description: input.work_description,
      source_timer_session_id: input.source_timer_session_id ?? null,
      workflow_status: input.workflow_status,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at ? input.deleted_at.toISOString() : null,
    };
  }
}
