import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
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
  // Step 1: Fetch timelog with employee and project relations
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      hrm_platform_project_id: true,
      deleted_at: true,
      employee: {
        select: {
          hrm_platform_user_id: true,
          hrm_platform_organization_id: true,
        },
      },
      project: {
        select: {
          status: true,
          hrm_platform_organization_id: true,
        },
      },
    },
  });
  // Step 2: Verify timelog exists and not soft-deleted
  if (!timelog || timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Step 3: Verify organization context - timelog must belong to member's organization
  if (
    timelog.employee.hrm_platform_organization_id !==
    timelog.project.hrm_platform_organization_id
  ) {
    throw new HttpException("Invalid timelog data", 500);
  }
  // Step 4: Check if timelog is locked by approved timesheet
  const lockedTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findFirst({
      where: {
        hrm_platform_timelog_id: props.timelogId,
        deleted_at: null,
        timesheet: {
          status: "approved",
          deleted_at: null,
        },
      },
      select: {
        id: true,
      },
    });
  if (lockedTimesheet) {
    throw new HttpException("Timelog is locked by an approved timesheet", 400);
  }
  // Step 5: Verify project status is not archived/completed
  if (
    timelog.project.status === "archived" ||
    timelog.project.status === "completed"
  ) {
    throw new HttpException(
      "Cannot update timelog for archived or completed project",
      400,
    );
  }
  // Step 6: Check authorization - owner or time:manage permission
  const isOwner = timelog.employee.hrm_platform_user_id === props.member.id;
  let hasTimeManagePermission = false;
  if (!isOwner) {
    // Fetch member's role in the organization and check permissions
    const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id:
          timelog.employee.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        hrm_platform_role_id: true,
      },
    });
    if (employee) {
      const rolePermissions =
        await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
          where: {
            hrm_platform_role_id: employee.hrm_platform_role_id,
            deleted_at: null,
            permission: {
              code: "time:manage",
              deleted_at: null,
            },
          },
          select: {
            id: true,
          },
        });
      hasTimeManagePermission = rolePermissions.length > 0;
    }
  }
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 7: Update the timelog
  const updateData: Prisma.hrm_platform_timelogsUpdateInput = {};
  if (props.body.date !== undefined) {
    updateData.date = new Date(props.body.date);
  }
  if (props.body.duration_minutes !== undefined) {
    updateData.duration_minutes = props.body.duration_minutes;
  }
  if (props.body.description !== undefined) {
    updateData.description = props.body.description;
  }
  if (props.body.billable !== undefined) {
    updateData.billable = props.body.billable;
  }
  updateData.updated_at = new Date();
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: updateData,
  });
  // Step 8: Fetch and transform the updated timelog
  const updatedTimelog =
    await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow({
      where: { id: props.timelogId },
      ...HrmPlatformTimelogTransformer.select(),
    });
  return await HrmPlatformTimelogTransformer.transform(updatedTimelog);
}
