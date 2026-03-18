import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimelogTransformer } from "../transformers/HrmTimeTrackingTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingTimelog.IUpdate;
}): Promise<IHrmTimeTrackingTimelog> {
  const current =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findFirstOrThrow({
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        work_date: true,
        duration_minutes: true,
        description: true,
        billable: true,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: current.employee_id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        userAccount: {
          select: {
            id: true,
          },
        },
      },
    });
  if (employee.organization_id !== current.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.userAccount.id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  const locked =
    await MyGlobal.prisma.hrm_time_tracking_timesheet_timelogs.findFirst({
      where: {
        timelog: {
          id: props.timelogId,
        },
        timesheet: {
          status: "approved",
        },
      },
      select: {
        id: true,
      },
    });
  if (locked !== null) {
    throw new HttpException("Timelog is locked by an approved timesheet", 400);
  }
  const nextProjectId = props.body.project_id ?? current.project_id;
  const project =
    await MyGlobal.prisma.hrm_time_tracking_projects.findFirstOrThrow({
      where: {
        id: nextProjectId,
        organization_id: current.organization_id,
        deleted_at: null,
        status: {
          notIn: ["archived", "completed"],
        },
      },
      select: {
        id: true,
      },
    });
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    await MyGlobal.prisma.hrm_time_tracking_tasks.findFirstOrThrow({
      where: {
        id: props.body.task_id,
        project: {
          id: project.id,
        },
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  }
  await MyGlobal.prisma.hrm_time_tracking_timelogs.update({
    where: {
      id: props.timelogId,
    },
    data: {
      ...(props.body.project_id !== undefined
        ? { project: { connect: { id: props.body.project_id } } }
        : {}),
      ...(props.body.task_id !== undefined
        ? props.body.task_id === null
          ? { task: { disconnect: true } }
          : { task: { connect: { id: props.body.task_id } } }
        : {}),
      ...(props.body.work_date !== undefined
        ? { work_date: props.body.work_date }
        : {}),
      ...(props.body.duration_minutes !== undefined
        ? { duration_minutes: props.body.duration_minutes }
        : {}),
      ...(props.body.description !== undefined
        ? { description: props.body.description }
        : {}),
      ...(props.body.billable !== undefined
        ? { billable: props.body.billable }
        : {}),
      updated_at: new Date(),
    },
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_timelogs.findUniqueOrThrow({
      where: {
        id: props.timelogId,
      },
      ...HrmTimeTrackingTimelogTransformer.select(),
    });
  return await HrmTimeTrackingTimelogTransformer.transform(updated);
}
