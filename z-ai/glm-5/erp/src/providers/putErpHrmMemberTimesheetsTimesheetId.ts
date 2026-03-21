import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimesheetTransformer } from "../transformers/ErpHrmTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheet.IUpdate;
}): Promise<IErpHrmTimesheet> {
  // Get session context for organization
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_organization_id: true },
    });
  if (session.erp_hrm_organization_id === null) {
    throw new HttpException("No organization context", 400);
  }
  // Get the timesheet with employee info
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      employee_id: true,
      employee: {
        select: {
          erp_hrm_member_id: true,
          erp_hrm_organization_id: true,
        },
      },
      week_start_date: true,
      week_end_date: true,
      status: true,
    },
  });
  // Verify the authenticated member owns the employee record
  if (timesheet.employee.erp_hrm_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify employee belongs to current organization context
  if (
    timesheet.employee.erp_hrm_organization_id !==
    session.erp_hrm_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Check timesheet status is 'draft' or 'rejected'
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException(
      "Cannot modify submitted or approved timesheet",
      403,
    );
  }
  // If timelog_ids is provided, update associations
  if (props.body.timelog_ids !== undefined) {
    const timelogIds = [...new Set(props.body.timelog_ids)];
    if (timelogIds.length > 0) {
      // Fetch all timelogs and verify constraints
      const timelogs = await MyGlobal.prisma.erp_hrm_timelogs.findMany({
        where: {
          id: { in: timelogIds },
          deleted_at: null,
        },
        select: {
          id: true,
          employee_id: true,
          date: true,
          timesheetTimelogs: {
            select: {
              timesheet: {
                select: { status: true },
              },
            },
          } satisfies Prisma.erp_hrm_timesheet_timelogsFindManyArgs,
        },
      });
      // Verify all timelogs exist
      if (timelogs.length !== timelogIds.length) {
        throw new HttpException("One or more timelogs not found", 400);
      }
      // Verify all timelogs belong to the same employee
      for (const timelog of timelogs) {
        if (timelog.employee_id !== timesheet.employee_id) {
          throw new HttpException("Timelog belongs to different employee", 400);
        }
      }
      // Verify all timelogs fall within the week range
      for (const timelog of timelogs) {
        if (
          timelog.date < timesheet.week_start_date ||
          timelog.date > timesheet.week_end_date
        ) {
          throw new HttpException("Timelog outside week range", 400);
        }
      }
      // Verify no timelog is part of an approved or submitted timesheet
      for (const timelog of timelogs) {
        for (const tt of timelog.timesheetTimelogs) {
          if (
            tt.timesheet.status === "approved" ||
            tt.timesheet.status === "submitted"
          ) {
            throw new HttpException(
              "Timelog already in submitted or approved timesheet",
              400,
            );
          }
        }
      }
    }
    // Clear existing timelog associations and create new ones
    await MyGlobal.prisma.$transaction(async (tx) => {
      // Delete existing associations
      await tx.erp_hrm_timesheet_timelogs.deleteMany({
        where: { timesheet_id: props.timesheetId },
      });
      // Create new associations if any timelogs provided
      if (timelogIds.length > 0) {
        await tx.erp_hrm_timesheet_timelogs.createMany({
          data: timelogIds.map((timelogId) => ({
            id: v4(),
            timesheet_id: props.timesheetId,
            timelog_id: timelogId,
            created_at: new Date(),
          })),
        });
      }
    });
  }
  // Recalculate total hours from current associations
  const aggregatedTimelogs = await MyGlobal.prisma.erp_hrm_timelogs.aggregate({
    where: {
      timesheetTimelogs: {
        some: { timesheet_id: props.timesheetId },
      },
    },
    _sum: { duration: true },
  });
  const totalHours = (aggregatedTimelogs._sum.duration ?? 0) / 60;
  // Determine new status: if rejected, change to draft for resubmission
  const newStatus =
    timesheet.status === "rejected" ? "draft" : timesheet.status;
  // Update timesheet with recalculated total_hours and potentially new status
  await MyGlobal.prisma.erp_hrm_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      status: newStatus,
      updated_at: new Date(),
    },
  });
  // Return updated timesheet using transformer
  const updatedTimesheet =
    await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimesheetTransformer.select(),
    });
  return ErpHrmTimesheetTransformer.transform(updatedTimesheet);
}
