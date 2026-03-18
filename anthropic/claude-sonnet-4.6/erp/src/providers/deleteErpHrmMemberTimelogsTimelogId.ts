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
  // 1. Fetch the timelog with its owning organization member's organization_id
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUniqueOrThrow({
    where: { id: props.timelogId },
    select: {
      id: true,
      organization_member_id: true,
      project_id: true,
      duration_minutes: true,
      work_date: true,
      timesheet_id: true,
      organizationMember: {
        select: {
          organization_id: true,
        },
      },
    },
  });
  // 2. Find the requesting member's organizational identity in the same organization
  const requesterOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: timelog.organizationMember.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (requesterOrgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Authorization: owner vs time:manage permission holder
  const isOwner = requesterOrgMember.id === timelog.organization_member_id;
  if (isOwner) {
    // Owners cannot delete timelogs that are part of submitted or approved timesheets
    if (timelog.timesheet_id !== null) {
      const timesheet =
        await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
          where: { id: timelog.timesheet_id },
          select: { status: true },
        });
      if (timesheet.status === "submitted" || timesheet.status === "approved") {
        throw new HttpException(
          "Cannot delete a timelog included in a submitted or approved timesheet",
          422,
        );
      }
    }
  } else {
    // Non-owners require the time:manage permission to proceed
    const hasTimeManage =
      await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
        where: {
          role_id: requesterOrgMember.role_id,
          permission_code: "time:manage",
        },
        select: { id: true },
      });
    if (hasTimeManage === null) {
      throw new HttpException("Forbidden", 403);
    }
    // time:manage holders bypass timesheet status restrictions entirely
  }
  // 4. Hard-delete the timelog; cascade handles any FK dependents
  await MyGlobal.prisma.erp_hrm_timelogs.delete({
    where: { id: props.timelogId },
  });
  // 5. Record audit trail for the deletion
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      organization_id: timelog.organizationMember.organization_id,
      organization_member_id: requesterOrgMember.id,
      action_type: "timelog_deleted",
      target_entity_type: "timelog",
      target_entity_id: props.timelogId,
      details: JSON.stringify({
        project_id: timelog.project_id,
        duration_minutes: timelog.duration_minutes,
        work_date: timelog.work_date.toISOString(),
      }),
      created_at: new Date(),
    },
  });
}
