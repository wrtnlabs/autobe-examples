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

export async function deleteErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string;
}): Promise<void> {
  // Find timesheet to verify existence and get ownership info
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      deleted_at: true,
      organization_member_id: true,
    },
  });
  // Return 404 if not found or already soft deleted
  if (timesheet === null || timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Get the organization member who owns this timesheet
  const timesheetOwner =
    await MyGlobal.prisma.erp_hrm_organization_members.findUnique({
      where: { id: timesheet.organization_member_id },
      select: {
        id: true,
        user_id: true,
        organization_id: true,
      },
    });
  if (timesheetOwner === null) {
    throw new HttpException("Timesheet owner not found", 404);
  }
  // Get current user's organization membership for this timesheet's organization
  const currentOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        user_id: props.member.id,
        organization_id: timesheetOwner.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // If user doesn't belong to this organization, return 403
  if (currentOrgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check ownership
  const isOwner = timesheetOwner.user_id === props.member.id;
  // If not owner, verify time management permission
  if (!isOwner) {
    const hasPermission =
      (await MyGlobal.prisma.erp_hrm_role_permissions.count({
        where: {
          role: {
            organizationMembers: {
              some: {
                user_id: props.member.id,
                organization_id: timesheetOwner.organization_id,
                deleted_at: null,
              },
            },
          },
          permission: "time:manage",
        },
      })) > 0;
    if (!hasPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Perform soft delete in transaction: unlink timelogs and mark timesheet deleted
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Unlink all timelogs from this timesheet
    await tx.erp_hrm_timelogs.updateMany({
      where: {
        timesheet_id: props.timesheetId,
        deleted_at: null,
      },
      data: {
        timesheet_id: null,
        updated_at: now,
      },
    });
    // Soft delete the timesheet
    await tx.erp_hrm_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    });
  });
}
