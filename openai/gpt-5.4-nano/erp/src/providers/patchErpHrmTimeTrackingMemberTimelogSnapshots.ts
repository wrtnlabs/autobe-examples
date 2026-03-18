import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTrackingTimelogSnapshot";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTrackingTimelogSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTrackingTimelogSnapshot";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeTrackingMemberTimelogSnapshots(props: {
  member: MemberPayload;
  body: IErpHrmTimeTrackingTimelogSnapshot.IRequest;
}): Promise<IPageIErpHrmTimeTrackingTimelogSnapshot.ISummary> {
  const body = props.body;
  const page = body.page ?? 1;
  const limit = body.limit ?? 20;
  if (page < 1) throw new HttpException("page must be >= 1", 400);
  if (limit < 1 || limit > 100)
    throw new HttpException("limit must be between 1 and 100", 400);
  const selectedOrganizationId = (props.member as any).organization_id;
  if (!selectedOrganizationId)
    throw new HttpException("Organization context missing", 403);
  const where = {
    organization_id: selectedOrganizationId,
    deleted_at: null,
    ...(body.erpHrmTimeTrackingTimelogId !== undefined && {
      erp_hrm_time_tracking_timelog_id: body.erpHrmTimeTrackingTimelogId,
    }),
    ...(body.employeeId !== undefined && { employee_id: body.employeeId }),
    ...(body.projectId !== undefined && { project_id: body.projectId }),
    ...(body.taskId !== undefined && { task_id: body.taskId }),
    ...(body.timesheetId !== undefined && { timesheet_id: body.timesheetId }),
    ...(body.sourceTimerSessionId !== undefined && {
      source_timer_session_id: body.sourceTimerSessionId,
    }),
    ...(body.workflowStatus !== undefined && {
      workflow_status: body.workflowStatus,
    }),
    ...(body.createdAtFrom !== undefined && {
      created_at: { gte: new Date(body.createdAtFrom) },
    }),
    ...(body.createdAtTo !== undefined && {
      created_at: { lte: new Date(body.createdAtTo) },
    }),
    ...(body.startedAtFrom !== undefined && {
      started_at: { gte: new Date(body.startedAtFrom) },
    }),
    ...(body.startedAtTo !== undefined && {
      started_at: { lte: new Date(body.startedAtTo) },
    }),
    ...(body.endedAtFrom !== undefined && {
      ended_at: { gte: new Date(body.endedAtFrom) },
    }),
    ...(body.endedAtTo !== undefined && {
      ended_at: { lte: new Date(body.endedAtTo) },
    }),
    ...(body.durationMinutesMin !== undefined && {
      duration_minutes: { gte: body.durationMinutesMin },
    }),
    ...(body.durationMinutesMax !== undefined && {
      duration_minutes: { lte: body.durationMinutesMax },
    }),
    ...(body.workDescriptionKeyword !== undefined && {
      work_description: {
        contains: body.workDescriptionKeyword,
        mode: "insensitive",
      },
    }),
  } satisfies Prisma.erp_hrm_time_tracking_timelog_snapshotsWhereInput;
  const orderBy = [{ created_at: "desc" as const }, { id: "desc" as const }];
  const data =
    await MyGlobal.prisma.erp_hrm_time_tracking_timelog_snapshots.findMany({
      where,
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
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
    });
  const records =
    await MyGlobal.prisma.erp_hrm_time_tracking_timelog_snapshots.count({
      where,
    });
  return {
    data: data.map((r) => ({
      id: r.id,
      erp_hrm_time_tracking_timelog_id: r.erp_hrm_time_tracking_timelog_id,
      organization_id: r.organization_id,
      employee_id: r.employee_id,
      project_id: r.project_id,
      task_id: r.task_id,
      timesheet_id: r.timesheet_id,
      started_at: toISOStringSafe(r.started_at),
      ended_at: toISOStringSafe(r.ended_at),
      duration_minutes: r.duration_minutes,
      work_description: r.work_description,
      source_timer_session_id: r.source_timer_session_id,
      workflow_status: r.workflow_status,
      created_at: toISOStringSafe(r.created_at),
      updated_at: toISOStringSafe(r.updated_at),
      deleted_at: r.deleted_at === null ? null : toISOStringSafe(r.deleted_at),
    })),
    pagination: {
      current: page,
      limit,
      records,
      pages: Math.ceil(records / limit),
    },
  } satisfies IPageIErpHrmTimeTrackingTimelogSnapshot.ISummary;
}
