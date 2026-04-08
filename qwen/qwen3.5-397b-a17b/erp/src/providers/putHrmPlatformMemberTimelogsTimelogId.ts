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
  // Fetch the timelog with employee relation to verify ownership
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId, deleted_at: null },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_project_id: true,
        hrm_platform_timesheet_id: true,
        employee: {
          select: {
            id: true,
            member_id: true,
            role_id: true,
          },
        },
      },
    },
  );
  // Fetch employee's role permissions to check for time:manage
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: timelog.employee.role_id,
        permission: {
          code: "time:manage",
          deleted_at: null,
        },
      },
    });
  const hasTimeManagePermission = rolePermissions.length > 0;
  const isOwner = timelog.employee.member_id === props.member.id;
  // Authorization check: must be owner OR have time:manage permission
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException(
      "Forbidden: You can only edit your own timelogs",
      403,
    );
  }
  // For non-admin users (owner without time:manage), check timesheet lock
  if (!hasTimeManagePermission && timelog.hrm_platform_timesheet_id !== null) {
    const timesheet =
      await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
        where: { id: timelog.hrm_platform_timesheet_id, deleted_at: null },
        select: { status: true },
      });
    // Per section 181: approved timesheets lock all timelogs
    if (timesheet.status === "approved") {
      throw new HttpException(
        "Forbidden: Cannot edit timelog in approved timesheet",
        403,
      );
    }
  }
  // Validate project membership if projectId is being changed
  if (props.body.projectId !== undefined) {
    const projectMembership =
      await MyGlobal.prisma.hrm_platform_project_members.findFirst({
        where: {
          hrm_platform_employee_id: timelog.employee.id,
          hrm_platform_project_id: props.body.projectId,
        },
      });
    if (!projectMembership) {
      throw new HttpException(
        "Bad Request: Employee is not a member of the specified project",
        400,
      );
    }
  }
  // Validate task belongs to project if taskId is provided
  if (props.body.taskId !== undefined && props.body.taskId !== null) {
    const task = await MyGlobal.prisma.hrm_platform_tasks.findUniqueOrThrow({
      where: { id: props.body.taskId, deleted_at: null },
      select: { hrm_platform_project_id: true },
    });
    const targetProjectId =
      props.body.projectId ?? timelog.hrm_platform_project_id;
    if (task.hrm_platform_project_id !== targetProjectId) {
      throw new HttpException(
        "Bad Request: Task must belong to the selected project",
        400,
      );
    }
  }
  // Build update data with only provided fields
  const updateData: Prisma.hrm_platform_timelogsUpdateInput = {
    ...(props.body.date !== undefined && { date: new Date(props.body.date) }),
    ...(props.body.durationMinutes !== undefined && {
      duration_minutes: props.body.durationMinutes,
    }),
    ...(props.body.projectId !== undefined && {
      project: { connect: { id: props.body.projectId } },
    }),
    ...(props.body.taskId !== undefined && {
      task:
        props.body.taskId === null
          ? { disconnect: true }
          : { connect: { id: props.body.taskId } },
    }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.billable !== undefined && { billable: props.body.billable }),
    updated_at: new Date(),
  };
  // Perform the update
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
  });
  // Fetch and return the updated timelog
  const updated = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      ...HrmPlatformTimelogTransformer.select(),
    },
  );
  return await HrmPlatformTimelogTransformer.transform(updated);
}
