import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmPlatformMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.IUpdate;
}): Promise<IHrmPlatformTimesheet> {
  // 1. Retrieve and validate timesheet exists and is not soft-deleted
  const timesheet = await MyGlobal.prisma.hrm_platform_timesheets.findUnique({
    where: { id: props.timesheetId },
    select: {
      id: true,
      hrm_platform_employee_id: true,
      status: true,
      week_start_date: true,
      deleted_at: true,
    },
  });
  if (timesheet === null || timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  const currentStatus = timesheet.status as
    | "draft"
    | "submitted"
    | "approved"
    | "rejected";
  const newStatus = props.body.status;
  // 2. Authorization checks
  if (newStatus === "submitted") {
    // Requester must be the timesheet owner
    // Find the employee record for this member (hrm_platform_user_id references hrm_platform_members.id)
    const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
    });
    if (
      employee === null ||
      employee.id !== timesheet.hrm_platform_employee_id
    ) {
      throw new HttpException(
        "Forbidden: You are not the owner of this timesheet",
        403,
      );
    }
  } else if (newStatus === "approved" || newStatus === "rejected") {
    // Requester must have time:approve permission
    // Check if member has a role with time:approve permission
    const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrm_platform_role_id: true,
      },
    });
    if (employee === null || employee.hrm_platform_role_id === null) {
      throw new HttpException(
        "Forbidden: You do not have permission to approve timesheets",
        403,
      );
    }
    // Check if role has time:approve permission via role_permissions junction
    const hasApprovePermission =
      await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
        where: {
          hrm_platform_role_id: employee.hrm_platform_role_id,
          permission: {
            code: "time:approve",
          },
        },
      });
    if (hasApprovePermission === null) {
      throw new HttpException(
        "Forbidden: You do not have permission to approve timesheets",
        403,
      );
    }
  }
  // 3. Status transition validation
  const validTransitions: Record<string, string[]> = {
    draft: ["submitted"],
    submitted: ["approved", "rejected"],
    approved: [],
    rejected: ["draft"],
  };
  if (newStatus && !validTransitions[currentStatus]?.includes(newStatus)) {
    throw new HttpException(
      `Invalid status transition from ${currentStatus} to ${newStatus}`,
      400,
    );
  }
  // 4. Business rule validation
  if (newStatus === "submitted") {
    // Check if timesheet has at least one timelog
    const timelogCount =
      await MyGlobal.prisma.hrm_platform_timesheet_timelogs.count({
        where: { hrm_platform_timesheet_id: props.timesheetId },
      });
    if (timelogCount === 0) {
      throw new HttpException("Cannot submit empty timesheet", 400);
    }
    // Check for duplicate timesheet in same week
    const duplicate = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: timesheet.hrm_platform_employee_id,
        week_start_date: timesheet.week_start_date,
        id: { not: props.timesheetId },
        status: { in: ["submitted", "approved"] },
        deleted_at: null,
      },
    });
    if (duplicate !== null) {
      throw new HttpException(
        "A timesheet for this week is already submitted or approved",
        400,
      );
    }
  }
  // 5. Build update data
  const updateData: Prisma.hrm_platform_timesheetsUpdateInput = {
    ...(newStatus && { status: newStatus }),
    ...(newStatus === "submitted" && {
      submitted_at: new Date(),
    }),
    ...(newStatus === "approved" || newStatus === "rejected"
      ? {
          reviewed_at: new Date(),
          hrm_platform_member_id: props.member.id,
        }
      : {}),
    ...(props.body.rejection_reason !== undefined && {
      rejection_reason: props.body.rejection_reason,
    }),
    updated_at: new Date(),
  };
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: updateData,
  });
  // 6. Return transformed timesheet
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
