import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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
      where: { id: props.timelogId, deleted_at: null },
      select: {
        id: true,
        employee_id: true,
        timesheet_id: true,
        timesheet: { select: { status: true } },
      },
    },
  );
  if (
    timelog.timesheet_id !== null &&
    timelog.timesheet?.status === "approved"
  ) {
    throw new HttpException("Cannot update timelog in approved timesheet", 422);
  }
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: { user_id: props.member.id, deleted_at: null },
      select: { id: true, role_id: true, organization_id: true },
    });
  const isOwner = timelog.employee_id === employee.id;
  if (!isOwner) {
    const hasTimeManagePermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: employee.role_id,
          permission: "time:manage",
          deleted_at: null,
        },
      });
    if (!hasTimeManagePermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  if (props.body.project_id !== undefined) {
    const projectMembership =
      await MyGlobal.prisma.hrm_platform_project_members.findFirst({
        where: {
          hrm_platform_employee_id: employee.id,
          hrm_platform_project_id: props.body.project_id,
          deleted_at: null,
        },
      });
    if (!projectMembership) {
      throw new HttpException("Employee is not assigned to this project", 400);
    }
    if (props.body.task_id !== undefined && props.body.task_id !== null) {
      const task = await MyGlobal.prisma.hrm_platform_tasks.findUnique({
        where: { id: props.body.task_id },
        select: { hrm_platform_project_id: true },
      });
      if (!task || task.hrm_platform_project_id !== props.body.project_id) {
        throw new HttpException(
          "Task does not belong to the specified project",
          400,
        );
      }
    }
  }
  const updated = await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: {
      ...(props.body.date !== undefined && { date: new Date(props.body.date) }),
      ...(props.body.duration_minutes !== undefined && {
        duration_minutes: props.body.duration_minutes,
      }),
      ...(props.body.project_id !== undefined && {
        project_id: props.body.project_id,
      }),
      ...(props.body.task_id !== undefined && { task_id: props.body.task_id }),
      ...(props.body.description !== undefined && {
        description: props.body.description,
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
