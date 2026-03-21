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
  // Step 1: Get the current employee's organization context and permissions
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
      status: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  // Step 2: Check if user has time:manage permission
  const rolePermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
      },
      select: {
        permission: true,
      },
    });
  const hasTimeManagePermission = rolePermissions.some(
    (rp) => rp.permission === "time:manage",
  );
  // Step 3: Find the timelog and verify it belongs to the same organization
  const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUnique({
    where: {
      id: props.timelogId,
    },
    select: {
      id: true,
      erp_hrm_employee_id: true,
      erp_hrm_project_id: true,
      project: {
        select: {
          erp_hrm_organization_id: true,
        },
      },
    },
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found", 404);
  }
  // Verify timelog belongs to the same organization
  if (
    timelog.project.erp_hrm_organization_id !== employee.erp_hrm_organization_id
  ) {
    throw new HttpException("Access denied", 403);
  }
  // Step 4: Authorization check
  const isOwner = timelog.erp_hrm_employee_id === employee.id;
  if (!isOwner && !hasTimeManagePermission) {
    throw new HttpException("Access denied", 403);
  }
  // Step 5: If user doesn't have time:manage permission, check timesheet status
  if (!hasTimeManagePermission) {
    // Find all timesheets associated with this timelog
    const timesheetTimelogs =
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findMany({
        where: {
          erp_hrm_timelog_id: props.timelogId,
        },
        select: {
          timesheet: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });
    // Check if any associated timesheet is submitted or approved
    const hasLockedTimesheet = timesheetTimelogs.some(
      (st) =>
        st.timesheet.status === "submitted" ||
        st.timesheet.status === "approved",
    );
    if (hasLockedTimesheet) {
      throw new HttpException(
        "Cannot delete timelog that is part of a submitted or approved timesheet",
        400,
      );
    }
  }
  // Step 6: Hard delete the timelog
  // Cascade will handle removal from erp_hrm_timesheet_timelogs junction table
  await MyGlobal.prisma.erp_hrm_timelogs.delete({
    where: { id: props.timelogId },
  });
  // Step 7: Log the deletion action in activity_logs
  // Especially for time:manage overrides
  if (hasTimeManagePermission && !isOwner) {
    await MyGlobal.prisma.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        erp_hrm_organization_id: employee.erp_hrm_organization_id,
        erp_hrm_member_id: props.member.id,
        action_type: "timelog_deleted",
        target_entity_type: "timelog",
        target_entity_id: props.timelogId,
        details: JSON.stringify({
          reason: "time:manage override",
          deleted_employee_id: timelog.erp_hrm_employee_id,
        }),
        created_at: new Date(),
      },
    });
  }
}
