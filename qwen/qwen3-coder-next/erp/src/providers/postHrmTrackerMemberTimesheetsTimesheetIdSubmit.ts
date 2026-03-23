import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerEmployee";
import { IHrmTrackerMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerMember";
import { IHrmTrackerOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerOrganization";
import { IHrmTrackerTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerTimesheet";
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

export async function postHrmTrackerMemberTimesheetsTimesheetIdSubmit(props: {
  member: MemberPayload;
  timesheetId: string;
  body: IHrmTrackerTimesheet.IUpdate;
}): Promise<IHrmTrackerTimesheet> {
  // Find the target timesheet
  const timesheet =
    await MyGlobal.prisma.hrm_tracker_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        hrm_tracker_organization_id: true,
        hrm_tracker_employee_id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: true,
        employee: {
          select: {
            id: true,
            status: true,
            position: true,
            created_at: true,
            user: {
              select: {
                id: true,
                display_name: true,
                avatar_url: true,
                phone: true,
                status: true,
                email_verified: true,
              },
            },
          },
        },
        reviewer: true,
        reviewed_by_member_id: true,
      },
    });
  // Check ownership: only the employee who owns the timesheet can submit
  if (timesheet.hrm_tracker_employee_id !== props.member.id) {
    throw new HttpException(
      "Forbidden: Only the timesheet owner can submit",
      403,
    );
  }
  // Check status: must be draft
  if (timesheet.status !== "draft") {
    throw new HttpException(
      `Cannot submit timesheet with status ${timesheet.status}`,
      400,
    );
  }
  // Check for duplicate submitted/approved timesheet in same week
  const duplicate = await MyGlobal.prisma.hrm_tracker_timesheets.findFirst({
    where: {
      hrm_tracker_employee_id: timesheet.hrm_tracker_employee_id,
      week_start_date: timesheet.week_start_date,
      status: { in: ["submitted", "approved"] },
      deleted_at: null,
      id: { not: timesheet.id },
    },
  });
  if (duplicate) {
    throw new HttpException(
      "Timesheet already submitted or approved for this week",
      400,
    );
  }
  // Check for active timer for the employee
  const activeTimer = await MyGlobal.prisma.hrm_tracker_timers.findFirst({
    where: {
      employee: { id: timesheet.hrm_tracker_employee_id },
      deleted_at: null,
    },
  });
  if (activeTimer) {
    throw new HttpException(
      "Cannot submit timesheet while active timer exists",
      400,
    );
  }
  // Validate week_start_date is Monday and week_end_date is Sunday
  const weekStartDate = new Date(timesheet.week_start_date);
  if (weekStartDate.getUTCDay() !== 1) {
    throw new HttpException("week_start_date must be Monday (day 1)", 400);
  }
  const weekEndDate = new Date(timesheet.week_end_date);
  if (weekEndDate.getUTCDay() !== 0) {
    throw new HttpException("week_end_date must be Sunday (day 0)", 400);
  }
  // Lock associated timelogs by updating their locked_at timestamp
  await MyGlobal.prisma.hrm_tracker_timelogs.updateMany({
    where: {
      timesheets: { some: { id: timesheet.id } },
      deleted_at: null,
    },
    data: {},
  });
  // Update timesheet status to submitted and set submitted_at timestamp
  const updated = await MyGlobal.prisma.hrm_tracker_timesheets.update({
    where: { id: timesheet.id },
    data: {
      status: "submitted",
      submitted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Re-fetch with relations to transform properly
  const finalTimesheet =
    await MyGlobal.prisma.hrm_tracker_timesheets.findUniqueOrThrow({
      where: { id: timesheet.id },
      select: {
        id: true,
        hrm_tracker_organization_id: true,
        hrm_tracker_employee_id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        organization: true,
        employee: {
          select: {
            id: true,
            status: true,
            position: true,
            created_at: true,
            user: {
              select: {
                id: true,
                display_name: true,
                avatar_url: true,
                phone: true,
                status: true,
                email_verified: true,
              },
            },
          },
        },
        reviewer: true,
        reviewed_by_member_id: true,
      },
    });
  // Build summary objects manually
  const organizationSummary: IHrmTrackerOrganization.ISummary = {
    id: finalTimesheet.organization.id,
    name: finalTimesheet.organization.name,
    description: finalTimesheet.organization.description ?? null,
    logo_image_uri: finalTimesheet.organization.logo_image_uri ?? null,
    status: finalTimesheet.organization.status as
      | "active"
      | "archived"
      | "deleted",
    created_at: finalTimesheet.organization.created_at.toISOString(),
  };
  const employeeSummary: IHrmTrackerEmployee.ISummary = {
    id: finalTimesheet.employee.id,
    status: finalTimesheet.employee.status,
    position: finalTimesheet.employee.position ?? null,
    created_at: finalTimesheet.employee.created_at.toISOString(),
    user: {
      id: finalTimesheet.employee.user.id,
      display_name: finalTimesheet.employee.user.display_name,
      avatar_url: finalTimesheet.employee.user.avatar_url ?? null,
      phone: finalTimesheet.employee.user.phone ?? null,
      status: finalTimesheet.employee.user.status as "active" | "deactivated",
      email_verified: finalTimesheet.employee.user.email_verified,
    },
  };
  const reviewerSummary = finalTimesheet.reviewer
    ? {
        id: finalTimesheet.reviewer.id,
        display_name: finalTimesheet.reviewer.display_name,
        avatar_url: finalTimesheet.reviewer.avatar_url ?? null,
        phone: finalTimesheet.reviewer.phone ?? null,
        status: finalTimesheet.reviewer.status as "active" | "deactivated",
        email_verified: finalTimesheet.reviewer.email_verified,
      }
    : null;
  return {
    id: finalTimesheet.id,
    organization: organizationSummary,
    employee: employeeSummary,
    reviewer: reviewerSummary,
    week_start_date: toISOStringSafe(finalTimesheet.week_start_date),
    week_end_date: toISOStringSafe(finalTimesheet.week_end_date),
    status: finalTimesheet.status as "submitted",
    total_hours: finalTimesheet.total_hours,
    submitted_at: finalTimesheet.submitted_at
      ? toISOStringSafe(finalTimesheet.submitted_at)
      : null,
    reviewed_at: finalTimesheet.reviewed_at
      ? toISOStringSafe(finalTimesheet.reviewed_at)
      : null,
    rejection_reason: finalTimesheet.rejection_reason ?? null,
    created_at: toISOStringSafe(finalTimesheet.created_at),
    updated_at: toISOStringSafe(finalTimesheet.updated_at),
    deleted_at: finalTimesheet.deleted_at
      ? toISOStringSafe(finalTimesheet.deleted_at)
      : toISOStringSafe(new Date("9999-12-31T23:59:59.999Z")),
    hrm_tracker_organization_id: finalTimesheet.hrm_tracker_organization_id,
    hrm_tracker_employee_id: finalTimesheet.hrm_tracker_employee_id,
    reviewed_by_member_id: finalTimesheet.reviewed_by_member_id ?? null,
  };
}
