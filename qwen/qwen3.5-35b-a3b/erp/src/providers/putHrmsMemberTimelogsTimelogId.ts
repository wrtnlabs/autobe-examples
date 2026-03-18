import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
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

export async function putHrmsMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmsTimelog.IUpdate;
}): Promise<IHrmsTimelog> {
  const timelog = await MyGlobal.prisma.hrms_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      billable: true,
      created_at: true,
      date: true,
      description: true,
      duration_minutes: true,
      updated_at: true,
      deleted_at: true,
      employee: { select: { id: true, organization_member_id: true } },
      project: { select: { id: true } },
      task: { select: { id: true } },
    },
  });
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog is already deleted", 409);
  }
  const employee = timelog.employee;
  const employeeOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findUnique({
      where: { id: employee.organization_member_id },
      select: {
        hrms_organization_id: true,
        organizationRole: { select: { permission: true } },
      },
    });
  if (employeeOrgMember === null) {
    throw new HttpException("Employee organization member not found", 409);
  }
  const memberOrgMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: employeeOrgMember.hrms_organization_id,
      },
      select: {
        organizationRole: { select: { permission: true } },
      },
    });
  const isOwner = employee.organization_member_id === props.member.id;
  const hasTimeManagePermission =
    (memberOrgMember !== null &&
      memberOrgMember.organizationRole?.permission === "time:manage") ??
    false;
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (props.body.duration_minutes !== undefined) {
    if (props.body.duration_minutes < 1) {
      throw new HttpException("Duration must be at least 1 minute", 400);
    }
  }
  if (props.body.project_id !== undefined) {
    const projectAssignment =
      await MyGlobal.prisma.hrms_project_members.findFirst({
        where: {
          employee_id: timelog.employee_id,
          project_id: props.body.project_id,
        },
      });
    if (projectAssignment === null) {
      throw new HttpException(
        "Employee is not assigned to the specified project",
        400,
      );
    }
  }
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const task = await MyGlobal.prisma.hrms_tasks.findUnique({
      where: { id: props.body.task_id },
      select: { hrms_project_id: true },
    });
    if (task === null) {
      throw new HttpException("Task not found", 404);
    }
    const targetProjectId = props.body.project_id ?? timelog.project_id;
    if (task.hrms_project_id !== targetProjectId) {
      throw new HttpException(
        "Task does not belong to the specified project",
        400,
      );
    }
  }
  const updateData = {
    ...(props.body.date !== undefined && {
      date: new Date(props.body.date),
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.duration_minutes !== undefined && {
      duration_minutes: props.body.duration_minutes,
    }),
    ...(props.body.project_id !== undefined && {
      project: {
        connect: { id: props.body.project_id },
      },
    }),
    ...(props.body.task_id !== undefined && {
      task:
        props.body.task_id === null
          ? { disconnect: true }
          : {
              connect: { id: props.body.task_id },
            },
    }),
    ...(props.body.billable !== undefined && {
      billable: props.body.billable,
    }),
    updated_at: new Date(),
  } satisfies Prisma.hrms_timelogsUpdateInput;
  const updated = await MyGlobal.prisma.hrms_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      billable: true,
      created_at: true,
      date: true,
      description: true,
      duration_minutes: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  return {
    id: updated.id,
    employee_id: updated.employee_id,
    project_id: updated.project_id,
    task_id: updated.task_id,
    billable: updated.billable,
    created_at: updated.created_at.toISOString(),
    date: updated.date.toISOString(),
    description: updated.description ?? undefined,
    duration_minutes: updated.duration_minutes,
    updated_at: updated.updated_at.toISOString(),
    deleted_at: updated.deleted_at?.toISOString() ?? null,
  } satisfies IHrmsTimelog;
}
