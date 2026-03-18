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

export async function deleteErpHrmMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get organization member for the authenticated member
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Organization context not selected", 403);
  }
  const callerOrganizationMemberId = organizationMember.id;
  const permissions =
    organizationMember.role?.rolePermissions.map(
      (rp: { permission: string }) => rp.permission,
    ) ?? [];
  const hasTimeManagePermission = permissions.includes("time:manage");
  // Load timelog with timesheet status for lock checking
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      organization_member_id: true,
      deleted_at: true,
      timesheet_id: true,
    },
  });
  // Return 404 if timelog not found or already deleted
  if (timelog === null || timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Verify ownership or administrative permission
  const isOwner = timelog.organization_member_id === callerOrganizationMemberId;
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Check timesheet status restrictions for non-admin users
  if (timelog.timesheet_id !== null) {
    const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUnique({
      where: { id: timelog.timesheet_id },
      select: { status: true },
    });
    if (timesheet !== null) {
      const timesheetStatus = timesheet.status;
      const isLocked =
        timesheetStatus === "submitted" || timesheetStatus === "approved";
      if (isLocked && !hasTimeManagePermission) {
        throw new HttpException(
          "Cannot delete timelog in submitted or approved timesheet",
          403,
        );
      }
    }
  }
  // Perform soft delete
  await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: new Date(),
    },
  });
}
