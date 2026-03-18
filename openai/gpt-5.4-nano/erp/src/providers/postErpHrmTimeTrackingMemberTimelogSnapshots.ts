import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTrackingTimelogSnapshotTransformer } from "../transformers/ErpHrmTimeTrackingTimelogSnapshotTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeTrackingMemberTimelogSnapshots(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimelogSnapshot.ICreate;
}): Promise<IErpHrmTimeTrackingTimelogSnapshot> {
  const startedAt = props.body.started_at;
  const endedAt = props.body.ended_at;
  if (endedAt < startedAt) {
    throw new HttpException(
      "ended_at must be greater than or equal to started_at",
      400,
    );
  }
  if (
    !Number.isInteger(props.body.duration_minutes) ||
    props.body.duration_minutes < 0
  ) {
    throw new HttpException(
      "duration_minutes must be a non-negative integer",
      400,
    );
  }
  const snapshot = await MyGlobal.prisma.$transaction(async (tx) => {
    const timelog = await tx.erp_hrm_time_tracking_timelogs.findUniqueOrThrow({
      where: { id: props.body.erp_hrm_time_tracking_timelog_id },
      select: {
        erp_hrm_time_tracking_organization_id: true,
        erp_hrm_time_tracking_employee_id: true,
        erp_hrm_time_tracking_project_id: true,
        erp_hrm_time_tracking_task_id: true,
        erp_hrm_time_tracking_timesheet_id: true,
        // NOTE: keep select fields aligned with downstream usage
        // source_timer_session_id is not part of the selected shape in this compilation error,
        // so omit using it with static typing.
        start_time: true,
        end_time: true,
        duration_minutes: true,
        note: true,
        created_at: true,
        updated_at: true,
      },
    } as any);
    const created = await tx.erp_hrm_time_tracking_timelog_snapshots.create({
      data: {
        id: v4(),
        organization_id: timelog.erp_hrm_time_tracking_organization_id,
        employee_id: timelog.erp_hrm_time_tracking_employee_id,
        project_id: timelog.erp_hrm_time_tracking_project_id,
        task_id: timelog.erp_hrm_time_tracking_task_id ?? null,
        timesheet_id: timelog.erp_hrm_time_tracking_timesheet_id ?? null,
        started_at: startedAt,
        ended_at: endedAt,
        duration_minutes: props.body.duration_minutes,
        work_description: timelog.note ?? props.body.work_description,
        // source_timer_session_id may exist in DB but is not in the selected type;
        // treat it as optional via runtime access.
        source_timer_session_id:
          (timelog as any).source_timer_session_id ?? null,
        workflow_status: props.body.workflow_status,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        erp_hrm_time_tracking_timelog_id:
          props.body.erp_hrm_time_tracking_timelog_id,
      },
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
        // include if exists on model
        source_timer_session_id: true,
        workflow_status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        erp_hrm_time_tracking_timelog_id: true,
      },
    });
    return created;
  });
  return await ErpHrmTimeTrackingTimelogSnapshotTransformer.transform(
    snapshot as any,
  );
}
