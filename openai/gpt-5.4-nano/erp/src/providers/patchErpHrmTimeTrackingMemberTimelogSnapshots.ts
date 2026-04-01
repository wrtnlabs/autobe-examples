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
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const activeContract =
    await MyGlobal.prisma.erp_hrm_time_tracking_contracts.findFirst({
      where: {
        erp_hrm_time_tracking_employee_id: props.member.id,
        deleted_at: null,
      },
      select: {
        erp_hrm_time_tracking_organization_id: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });
  if (activeContract === null) {
    throw new HttpException("Forbidden", 403);
  }
  const where = {
    erp_hrm_time_tracking_organization_id:
      activeContract.erp_hrm_time_tracking_organization_id,
    deleted_at: null,
    ...(props.body.erpHrmTimeTrackingTimelogId !== undefined
      ? {
          erp_hrm_time_tracking_timelog_id:
            props.body.erpHrmTimeTrackingTimelogId,
        }
      : {}),
    ...(props.body.employeeId !== undefined
      ? {
          employee_id: props.body.employeeId,
        }
      : {}),
    ...(props.body.projectId !== undefined
      ? {
          project_id: props.body.projectId,
        }
      : {}),
    ...(props.body.taskId !== undefined
      ? {
          task_id: props.body.taskId,
        }
      : {}),
    ...(props.body.timesheetId !== undefined
      ? {
          timesheet_id: props.body.timesheetId,
        }
      : {}),
    ...(props.body.sourceTimerSessionId !== undefined
      ? {
          source_timer_session_id: props.body.sourceTimerSessionId,
        }
      : {}),
    ...(props.body.workflowStatus !== undefined
      ? {
          workflow_status: props.body.workflowStatus,
        }
      : {}),
    ...(props.body.createdAtFrom !== undefined ||
    props.body.createdAtTo !== undefined
      ? {
          created_at: {
            ...(props.body.createdAtFrom !== undefined
              ? { gte: new Date(props.body.createdAtFrom) }
              : {}),
            ...(props.body.createdAtTo !== undefined
              ? { lte: new Date(props.body.createdAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.startedAtFrom !== undefined ||
    props.body.startedAtTo !== undefined
      ? {
          started_at: {
            ...(props.body.startedAtFrom !== undefined
              ? { gte: new Date(props.body.startedAtFrom) }
              : {}),
            ...(props.body.startedAtTo !== undefined
              ? { lte: new Date(props.body.startedAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.endedAtFrom !== undefined ||
    props.body.endedAtTo !== undefined
      ? {
          ended_at: {
            ...(props.body.endedAtFrom !== undefined
              ? { gte: new Date(props.body.endedAtFrom) }
              : {}),
            ...(props.body.endedAtTo !== undefined
              ? { lte: new Date(props.body.endedAtTo) }
              : {}),
          },
        }
      : {}),
    ...(props.body.durationMinutesMin !== undefined ||
    props.body.durationMinutesMax !== undefined
      ? {
          duration_minutes: {
            ...(props.body.durationMinutesMin !== undefined
              ? { gte: props.body.durationMinutesMin }
              : {}),
            ...(props.body.durationMinutesMax !== undefined
              ? { lte: props.body.durationMinutesMax }
              : {}),
          },
        }
      : {}),
    ...(props.body.workDescriptionKeyword !== undefined
      ? {
          work_description: {
            contains: props.body.workDescriptionKeyword,
            mode: typia.assert<"insensitive">("insensitive"),
          },
        }
      : {}),
  };
  const [rows, total] = await Promise.all([
    MyGlobal.prisma.erp_hrm_time_tracking_timelog_snapshots.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ created_at: "desc" }, { id: "desc" }],
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
    }),
    MyGlobal.prisma.erp_hrm_time_tracking_timelog_snapshots.count({ where }),
  ]);
  const pages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages,
    },
    data: rows.map((r) => ({
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
  };
}
