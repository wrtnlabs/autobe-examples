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
  // Step 1: Fetch the timelog
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      employee_id: true,
      deleted_at: true,
    },
  });
  if (timelog === null || timelog.deleted_at !== null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Step 2: Get the employee record for the current member
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      erp_hrm_organization_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 403);
  }
  // Step 3: Check if member has 'time:manage' permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "time:manage",
    },
    select: { id: true },
  });
  const hasTimeManagePermission = permission !== null;
  // Step 4: If not a manager, verify ownership and timesheet status
  if (hasTimeManagePermission === false) {
    // Check ownership
    if (timelog.employee_id !== employee.id) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if timelog is part of submitted or approved timesheet
    const timesheetAssociations =
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
        where: {
          timelog_id: props.timelogId,
        },
        select: {
          timesheet: {
            select: {
              status: true,
            },
          },
        },
      });
    for (const association of timesheetAssociations) {
      if (
        association.timesheet.status === "submitted" ||
        association.timesheet.status === "approved"
      ) {
        throw new HttpException(
          "Cannot delete timelog that is part of a submitted or approved timesheet",
          400,
        );
      }
    }
  }
  // Step 5: Perform soft delete
  await MyGlobal.prisma.erp_hrm_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: new Date(),
    },
  });
}
