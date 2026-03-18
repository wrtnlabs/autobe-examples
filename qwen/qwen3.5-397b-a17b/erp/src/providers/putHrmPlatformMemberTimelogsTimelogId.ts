import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimelog.IUpdate;
}): Promise<IHrmPlatformTimelog> {
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      ...HrmPlatformTimelogTransformer.select(),
    },
  );
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  const timelogEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: timelog.employee.id },
      select: {
        id: true,
        organization_id: true,
        member_id: true,
      },
    });
  const isOwner = timelogEmployee.member_id === props.member.id;
  let hasTimeManagePermission = false;
  if (!isOwner) {
    const requesterEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          member_id: props.member.id,
          organization_id: timelogEmployee.organization_id,
          deleted_at: null,
        },
        select: {
          role_id: true,
        },
      });
    if (requesterEmployee) {
      const rolePermissions =
        await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
          where: {
            role_id: requesterEmployee.role_id,
            permission: "time:manage",
          },
        });
      hasTimeManagePermission = rolePermissions.length > 0;
    }
  }
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  if (timelog.timesheet !== null && timelog.timesheet.status === "approved") {
    throw new HttpException("Cannot update timelog in approved timesheet", 403);
  }
  if (props.body.project_id !== undefined && props.body.project_id !== null) {
    const projectMembership =
      await MyGlobal.prisma.hrm_platform_project_members.findFirst({
        where: {
          employee: { id: timelogEmployee.id },
          project: { id: props.body.project_id },
          deleted_at: null,
        },
      });
    if (!projectMembership) {
      throw new HttpException("Employee is not assigned to this project", 400);
    }
  }
  if (props.body.task_id !== undefined && props.body.task_id !== null) {
    const targetProjectId = props.body.project_id ?? timelog.project.id;
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
      where: { id: props.body.task_id },
      select: { project: { select: { id: true } } },
    });
    if (!task || task.project.id !== targetProjectId) {
      throw new HttpException(
        "Task does not belong to the selected project",
        400,
      );
    }
  }
  const updated = await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: {
      ...(props.body.date !== undefined &&
        props.body.date !== null && { date: new Date(props.body.date) }),
      ...(props.body.duration_minutes !== undefined &&
        props.body.duration_minutes !== null && {
          duration_minutes: props.body.duration_minutes,
        }),
      ...(props.body.project_id !== undefined &&
        props.body.project_id !== null && {
          project: { connect: { id: props.body.project_id } },
        }),
      ...(props.body.task_id !== undefined
        ? props.body.task_id === null
          ? { task: { disconnect: true } }
          : { task: { connect: { id: props.body.task_id } } }
        : {}),
      ...(props.body.description !== undefined && {
        description: props.body.description ?? null,
      }),
      ...(props.body.billable !== undefined && {
        billable: props.body.billable,
      }),
      updated_at: new Date(),
    },
    ...HrmPlatformTimelogTransformer.select(),
  });
  return await HrmPlatformTimelogTransformer.transform(updated);
}
