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
  // Step 1: Retrieve timesheet
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        status: true,
        week_start_date: true,
        deleted_at: true,
      },
    });
  // Step 2: Check soft-deleted
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // Step 3: Get employee for authorization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: timesheet.hrm_platform_employee_id },
      select: {
        id: true,
        hrm_platform_user_id: true,
        hrm_platform_role_id: true,
      },
    });
  // Step 4: Authorization checks
  const newStatus = props.body.status;
  if (newStatus !== undefined) {
    if (newStatus === "submitted") {
      // Must be the timesheet owner
      if (employee.hrm_platform_user_id !== props.member.id) {
        throw new HttpException("Forbidden", 403);
      }
    } else if (newStatus === "approved" || newStatus === "rejected") {
      // Must have time:approve permission
      const permission =
        await MyGlobal.prisma.hrm_platform_permissions.findFirst({
          where: { code: "time:approve" },
          select: { id: true },
        });
      if (!permission) {
        throw new HttpException("Forbidden", 403);
      }
      const hasPermission =
        await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
          where: {
            hrm_platform_role_id: employee.hrm_platform_role_id,
            hrm_platform_permission_id: permission.id,
          },
        });
      if (!hasPermission) {
        throw new HttpException("Forbidden", 403);
      }
    }
  }
  // Step 5: Validate status transitions
  const currentStatus = timesheet.status;
  if (newStatus !== undefined) {
    const validTransitions: Record<string, string[]> = {
      draft: ["submitted"],
      submitted: ["approved", "rejected"],
      rejected: ["draft"],
      approved: [],
    };
    const allowed = validTransitions[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new HttpException("Invalid status transition", 400);
    }
  }
  // Step 6: Business rule validations
  if (newStatus === "submitted") {
    // Check has at least one timelog
    const timelogCount =
      await MyGlobal.prisma.hrm_platform_timesheet_timelogs.count({
        where: { hrm_platform_timesheet_id: props.timesheetId },
      });
    if (timelogCount === 0) {
      throw new HttpException("Cannot submit empty timesheet", 400);
    }
    // Check no duplicate timesheet for same employee and week
    const duplicate = await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
      where: {
        hrm_platform_employee_id: timesheet.hrm_platform_employee_id,
        week_start_date: timesheet.week_start_date,
        id: { not: props.timesheetId },
        status: { in: ["submitted", "approved"] },
        deleted_at: null,
      },
    });
    if (duplicate) {
      throw new HttpException("Timesheet already exists for this week", 400);
    }
  }
  // Step 7: Build update data
  const updateData: Prisma.hrm_platform_timesheetsUpdateInput = {};
  if (newStatus !== undefined) {
    updateData.status = newStatus;
  }
  if (newStatus === "submitted") {
    updateData.submitted_at = new Date();
  }
  if (newStatus === "approved" || newStatus === "rejected") {
    updateData.reviewed_at = new Date();
  }
  if (props.body.rejection_reason !== undefined) {
    updateData.rejection_reason = props.body.rejection_reason;
  }
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: updateData,
  });
  // Step 8: Fetch and return updated timesheet
  const updated =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updated);
}
