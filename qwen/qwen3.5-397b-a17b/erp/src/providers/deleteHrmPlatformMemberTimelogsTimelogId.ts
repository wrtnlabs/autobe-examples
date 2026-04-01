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
  // Retrieve timelog - findUniqueOrThrow handles 404 automatically
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: {
        id: props.timelogId,
        deleted_at: null,
      },
      select: {
        id: true,
        employee_id: true,
        timesheet_id: true,
      },
    },
  );
  // Get requester's employee record
  const requesterEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  // Check if requester is the timelog owner
  const isOwner = requesterEmployee.id === timelog.employee_id;
  // Check if requester has time:manage permission
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: requesterEmployee.role_id,
        permission: "time:manage",
        deleted_at: null,
      },
    });
  const hasTimeManagePermission = rolePermissions.length > 0;
  // Authorization check: must be owner OR have time:manage permission
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // For non-managers, check timesheet status
  if (!hasTimeManagePermission && timelog.timesheet_id !== null) {
    const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
      where: {
        id: timelog.timesheet_id,
        deleted_at: null,
      },
      select: {
        status: true,
      },
    });
    // Reject if timesheet is submitted or approved
    if (
      timesheet &&
      (timesheet.status === "submitted" || timesheet.status === "approved")
    ) {
      throw new HttpException(
        "Cannot delete timelog in submitted or approved timesheet",
        403,
      );
    }
  }
  // Perform soft delete
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: {
      id: props.timelogId,
    },
    data: {
      deleted_at: new Date().toISOString() as string & tags.Format<"date-time">,
    },
  });
}
