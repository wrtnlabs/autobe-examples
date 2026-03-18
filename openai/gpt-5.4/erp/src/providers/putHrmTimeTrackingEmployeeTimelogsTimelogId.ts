import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimelogTransformer } from "../transformers/HrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingEmployeeTimelogsTimelogId(props: {
  employee: EmployeePayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimelog.IUpdate;
}): Promise<IHrmTimeTrackingTimelog> {
  const session =
    await MyGlobal.prisma.hrm_time_tracking_employee_sessions.findUniqueOrThrow(
      {
        where: {
          id: props.employee.session_id,
        },
        select: {
          id: true,
          expired_at: true,
          logged_out_at: true,
          hrm_time_tracking_employee_id: true,
          hrm_time_tracking_organization_id: true,
          employee: {
            select: {
              deleted_at: true,
            },
          },
        },
      },
    );
  if (session.logged_out_at !== null || session.expired_at <= new Date()) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.employee.deleted_at !== null) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.hrm_time_tracking_employee_id !== props.employee.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.hrm_time_tracking_organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const organizationId = session.hrm_time_tracking_organization_id;
  return await MyGlobal.prisma.$transaction(async (tx) => {
    const timelog = await tx.hrm_time_tracking_timelogs.findFirstOrThrow({
      where: {
        id: props.timelogId,
        deleted_at: null,
        hrm_time_tracking_organization_id: organizationId,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_project_id: true,
        hrm_time_tracking_task_id: true,
      },
    });
    if (timelog.hrm_time_tracking_employee_id !== props.employee.id) {
      throw new HttpException("Forbidden", 403);
    }
    const memberships = await tx.hrm_time_tracking_timesheet_timelogs.findMany({
      where: {
        hrm_time_tracking_timelog_id: timelog.id,
        deleted_at: null,
        timesheet: {
          hrm_time_tracking_organization_id: organizationId,
        },
      },
      select: {
        id: true,
        timesheet: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });
    for (const membership of memberships) {
      if (membership.timesheet.status === "approved") {
        throw new HttpException("Approved timesheet timelogs are locked", 400);
      }
      if (membership.timesheet.status === "submitted") {
        throw new HttpException(
          "Submitted timesheet timelogs cannot be edited",
          400,
        );
      }
    }
    const effectiveProjectId =
      props.body.hrm_time_tracking_project_id ??
      timelog.hrm_time_tracking_project_id;
    await tx.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: effectiveProjectId,
        hrm_time_tracking_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    const effectiveTaskId =
      props.body.hrm_time_tracking_task_id === undefined
        ? props.body.hrm_time_tracking_project_id === undefined
          ? timelog.hrm_time_tracking_task_id
          : ((
              await tx.hrm_time_tracking_tasks.findFirst({
                where: {
                  id: timelog.hrm_time_tracking_task_id ?? undefined,
                  hrm_time_tracking_project_id: effectiveProjectId,
                  deleted_at: null,
                },
                select: {
                  id: true,
                },
              })
            )?.id ?? null)
        : props.body.hrm_time_tracking_task_id === null
          ? null
          : (
              await tx.hrm_time_tracking_tasks.findFirstOrThrow({
                where: {
                  id: props.body.hrm_time_tracking_task_id,
                  hrm_time_tracking_project_id: effectiveProjectId,
                  deleted_at: null,
                },
                select: {
                  id: true,
                },
              })
            ).id;
    await tx.hrm_time_tracking_timelogs.update({
      where: {
        id: timelog.id,
      },
      data: {
        ...(effectiveProjectId !== timelog.hrm_time_tracking_project_id && {
          hrm_time_tracking_project_id: effectiveProjectId,
        }),
        ...(effectiveTaskId !== timelog.hrm_time_tracking_task_id && {
          hrm_time_tracking_task_id: effectiveTaskId,
        }),
        ...(props.body.worked_on !== undefined && {
          worked_on: new Date(props.body.worked_on),
        }),
        ...(props.body.duration_minutes !== undefined && {
          duration_minutes: props.body.duration_minutes,
        }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.billable !== undefined && {
          billable: props.body.billable,
        }),
        updated_at: new Date(),
      },
    });
    const updated = await tx.hrm_time_tracking_timelogs.findUniqueOrThrow({
      where: {
        id: timelog.id,
      },
      ...HrmTimeTrackingTimelogTransformer.select(),
    });
    return await HrmTimeTrackingTimelogTransformer.transform(updated);
  });
}
