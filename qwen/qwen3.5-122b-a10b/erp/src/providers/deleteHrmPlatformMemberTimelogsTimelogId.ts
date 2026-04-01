import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify timelog exists and is not already deleted
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      hrm_platform_project_id: true,
      hrm_platform_task_id: true,
      date: true,
      duration_minutes: true,
      description: true,
      billable: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found", 404);
  }
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  // 2. Get the employee record for the timelog
  const timelogEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findUnique({
      where: { id: timelog.hrm_platform_employee_id },
      select: {
        id: true,
        hrm_platform_user_id: true,
        hrm_platform_organization_id: true,
        hrm_platform_role_id: true,
      },
    });
  if (timelogEmployee === null) {
    throw new HttpException("Timelog employee not found", 404);
  }
  // 3. Check authorization
  const isOwner = timelogEmployee.hrm_platform_user_id === props.member.id;
  let hasTimeManagePermission = false;
  if (!isOwner) {
    // Check if member has time:manage permission in the organization
    const memberEmployee =
      await MyGlobal.prisma.hrm_platform_employees.findFirst({
        where: {
          hrm_platform_user_id: props.member.id,
          hrm_platform_organization_id:
            timelogEmployee.hrm_platform_organization_id,
          deleted_at: null,
        },
        select: {
          hrm_platform_role_id: true,
        },
      });
    if (memberEmployee !== null) {
      const rolePermissions =
        await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
          where: {
            hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
          },
          select: {
            hrm_platform_permission_id: true,
          },
        });
      const permissionIds = rolePermissions.map(
        (rp) => rp.hrm_platform_permission_id,
      );
      if (permissionIds.length > 0) {
        const permissions =
          await MyGlobal.prisma.hrm_platform_permissions.findMany({
            where: {
              id: {
                in: permissionIds,
              },
              name: "time:manage",
            },
            select: {
              id: true,
            },
          });
        hasTimeManagePermission = permissions.length > 0;
      }
    }
  }
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Check timesheet status
  const timesheetLinks =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
      where: {
        hrm_platform_timelog_id: props.timelogId,
        deleted_at: null,
      },
      select: {
        hrm_platform_timesheet_id: true,
      },
    });
  if (timesheetLinks.length > 0) {
    const timesheetIds = timesheetLinks.map(
      (tl) => tl.hrm_platform_timesheet_id,
    );
    const timesheets = await MyGlobal.prisma.hrm_platform_timesheets.findMany({
      where: {
        id: {
          in: timesheetIds,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
    const hasApproved = timesheets.some((ts) => ts.status === "approved");
    const hasSubmitted = timesheets.some((ts) => ts.status === "submitted");
    if (hasApproved) {
      throw new HttpException(
        "Timelog is part of an approved timesheet and cannot be deleted",
        409,
      );
    }
    if (hasSubmitted) {
      throw new HttpException(
        "Timelog is part of a submitted timesheet. Wait for rejection or approval before deletion",
        409,
      );
    }
  }
  // 5. Perform soft delete
  const now = new Date();
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: now,
      updated_at: now,
    },
  });
  // 6. Create activity log if admin action (time:manage permission)
  if (!isOwner && hasTimeManagePermission) {
    const activityId = v4();
    await MyGlobal.prisma.hrm_platform_activity_logs.create({
      data: {
        id: activityId,
        organization_id: timelogEmployee.hrm_platform_organization_id,
        user_id: props.member.id,
        action_type: "timelog:deleted",
        target_entity: "timelog",
        target_id: props.timelogId,
        details: JSON.stringify({
          admin_member_id: props.member.id,
          employee_id: timelogEmployee.id,
        }),
        created_at: now,
      },
    });
  }
}
