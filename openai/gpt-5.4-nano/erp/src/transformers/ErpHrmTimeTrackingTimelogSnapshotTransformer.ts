import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace ErpHrmTimeTrackingTimelogSnapshotTransformer {
  export type Payload =
    Prisma.erp_hrm_time_tracking_timelog_snapshotsGetPayload<
      ReturnType<typeof select>
    >;
  export function select() {
    return {
      select: {
        id: true,
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
        erp_hrm_time_tracking_timelog_id: true,
        timelog: {
          select: {
            id: true,
          },
        },
      },
    } satisfies Prisma.erp_hrm_time_tracking_timelog_snapshotsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeTrackingTimelogSnapshot> {
    return {
      id: input.id,
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
      deleted_at: input.deleted_at?.toISOString() ?? null,
      erp_hrm_time_tracking_timelog_id: input.erp_hrm_time_tracking_timelog_id,
    };
  }
}
