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
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Step 1: Fetch the timesheet by id, including the owner's organization info
    const timesheet = await tx.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        organization_member_id: true,
        status: true,
        owner: {
          select: {
            id: true,
            organization_id: true,
          },
        },
      },
    });
    // Step 2: Find the requesting member's OrganizationMember record in the same organization
    const requesterMember = await tx.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: timesheet.owner.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
    if (requesterMember === null) {
      throw new HttpException("Forbidden", 403);
    }
    // Step 3: Authorization check - owner OR has time:manage permission
    const isOwner = requesterMember.id === timesheet.organization_member_id;
    if (!isOwner) {
      const timeManagePermission = await tx.erp_hrm_role_permissions.findFirst({
        where: {
          role_id: requesterMember.role_id,
          permission_code: "time:manage",
        },
        select: { id: true },
      });
      if (timeManagePermission === null) {
        throw new HttpException("Forbidden", 403);
      }
    }
    // Step 4: Status check - only 'draft' timesheets can be deleted
    if (timesheet.status === "submitted" || timesheet.status === "approved") {
      throw new HttpException(
        "Timesheet cannot be deleted in its current status. Only draft timesheets can be deleted.",
        409,
      );
    }
    // Step 5: Delete the timesheet (cascade handles associated timelogs)
    await tx.erp_hrm_timesheets.delete({
      where: { id: props.timesheetId },
    });
  });
}
