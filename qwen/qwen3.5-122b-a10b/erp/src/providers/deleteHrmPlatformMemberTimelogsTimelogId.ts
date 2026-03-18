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
  // 1. Find timelog and verify existence
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      deleted_at: true,
    },
  });
  if (timelog === null || timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  // 2. Check authorization: owner or time:manage permission
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      id: timelog.hrm_platform_employee_id,
      hrm_platform_user_id: props.member.id,
      deleted_at: null,
    },
  });
  const isOwner = employee !== null;
  let hasTimeManagePermission = false;
  let organizationId: string | null = null;
  if (!isOwner) {
    // Get all organizations the member belongs to
    const employeeRecords =
      await MyGlobal.prisma.hrm_platform_employees.findMany({
        where: {
          hrm_platform_user_id: props.member.id,
          deleted_at: null,
        },
        select: { hrm_platform_organization_id: true },
      });
    const organizationIds = employeeRecords.map(
      (e) => e.hrm_platform_organization_id,
    );
    if (organizationIds.length > 0) {
      // Check if member has time:manage permission in any of their organizations
      const roleWithPermission =
        await MyGlobal.prisma.hrm_platform_roles.findFirst({
          where: {
            hrm_platform_organization_id: {
              in: organizationIds,
            },
            deleted_at: null,
            permissions: {
              some: {
                permission: {
                  code: "time:manage",
                },
              },
            },
          },
        });
      if (roleWithPermission !== null) {
        hasTimeManagePermission = true;
        organizationId = roleWithPermission.hrm_platform_organization_id;
      }
    }
  }
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check timesheet status constraints
  const timesheetLinks =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
      where: {
        hrm_platform_timelog_id: props.timelogId,
        deleted_at: null,
      },
      include: {
        timesheet: {
          select: {
            status: true,
          },
        },
      },
    });
  for (const link of timesheetLinks) {
    if (link.timesheet.status === "approved") {
      throw new HttpException(
        "Timelog is part of an approved timesheet and cannot be deleted",
        409,
      );
    }
    if (link.timesheet.status === "submitted") {
      throw new HttpException(
        "Timelog is part of a submitted timesheet. Wait for rejection or approval before deletion",
        409,
      );
    }
  }
  // 4. Perform soft delete
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: new Date(),
    },
  });
  // 5. Create activity log if admin action (time:manage, not owner)
  if (hasTimeManagePermission && !isOwner && organizationId) {
    const activityLogId = v4() as string & tags.Format<"uuid">;
    await MyGlobal.prisma.hrm_platform_activity_logs.create({
      data: {
        id: activityLogId,
        user_id: props.member.id,
        organization_id: organizationId,
        action_type: "timelog:delete",
        target_entity: "timelog",
        target_id: props.timelogId,
        details: JSON.stringify({ admin_action: true }),
        created_at: new Date(),
      },
    });
  }
}
