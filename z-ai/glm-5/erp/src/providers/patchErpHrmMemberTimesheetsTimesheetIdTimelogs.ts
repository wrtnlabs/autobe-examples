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

export async function patchErpHrmMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimesheet.IUpdateTimelog;
}): Promise<IErpHrmTimesheet> {
  // Fetch timesheet with employee and role permissions
  const timesheet = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      employee_id: true,
      week_start_date: true,
      week_end_date: true,
      status: true,
      employee: {
        select: {
          id: true,
          erp_hrm_member_id: true,
          erp_hrm_organization_id: true,
          status: true,
        },
      },
    },
  });
  // Check if member has employee record in this organization
  const ownerEmployee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: timesheet.employee.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      erp_hrm_role_id: true,
    },
  });
  if (ownerEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Fetch role permissions separately
  const rolePermissions =
    await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
      where: { erp_hrm_role_id: ownerEmployee.erp_hrm_role_id },
      select: { permission: true },
    });
  const isOwner = ownerEmployee.id === timesheet.employee_id;
  const hasTimeManage = rolePermissions.some(
    (p) => p.permission === "time:manage",
  );
  if (!isOwner && !hasTimeManage) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if employee is deactivated
  if (ownerEmployee.status !== "active") {
    throw new HttpException("Forbidden", 403);
  }
  // Validate timesheet status
  const canModify =
    timesheet.status === "draft" ||
    timesheet.status === "rejected" ||
    hasTimeManage;
  if (!canModify) {
    throw new HttpException(
      "Timesheet cannot be modified in current status",
      400,
    );
  }
  const addIds = props.body.add ?? [];
  const removeIds = props.body.remove ?? [];
  // Validate timelogs to add
  for (const timelogId of addIds) {
    const timelog = await MyGlobal.prisma.erp_hrm_timelogs.findUnique({
      where: { id: timelogId },
      select: {
        id: true,
        employee_id: true,
        date: true,
        deleted_at: true,
      },
    });
    if (timelog === null || timelog.deleted_at !== null) {
      throw new HttpException("Timelog not found", 404);
    }
    if (timelog.employee_id !== timesheet.employee_id) {
      throw new HttpException(
        "Timelog does not belong to timesheet owner",
        400,
      );
    }
    const weekStart = timesheet.week_start_date;
    const weekEnd = timesheet.week_end_date;
    if (timelog.date < weekStart || timelog.date > weekEnd) {
      throw new HttpException("Timelog is outside timesheet week range", 400);
    }
    // Check if already in another timesheet for this week
    const existingAssociation =
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findFirst({
        where: {
          timelog_id: timelogId,
          timesheet: {
            employee_id: timesheet.employee_id,
            week_start_date: timesheet.week_start_date,
          },
        },
      });
    if (existingAssociation !== null) {
      throw new HttpException(
        "Timelog already included in another timesheet",
        400,
      );
    }
  }
  // Validate timelogs to remove exist in this timesheet
  for (const timelogId of removeIds) {
    const association =
      await MyGlobal.prisma.erp_hrm_timesheet_timelogs.findFirst({
        where: {
          timesheet_id: props.timesheetId,
          timelog_id: timelogId,
        },
      });
    if (association === null) {
      throw new HttpException("Timelog not found in this timesheet", 400);
    }
  }
  // Execute transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Remove timelogs
    if (removeIds.length > 0) {
      await tx.erp_hrm_timesheet_timelogs.deleteMany({
        where: {
          timesheet_id: props.timesheetId,
          timelog_id: { in: removeIds },
        },
      });
    }
    // Add timelogs
    for (const timelogId of addIds) {
      await tx.erp_hrm_timesheet_timelogs.create({
        data: {
          id: v4(),
          timesheet_id: props.timesheetId,
          timelog_id: timelogId,
          created_at: new Date(),
        },
      });
    }
    // Recalculate total_hours
    const associations = await tx.erp_hrm_timesheet_timelogs.findMany({
      where: { timesheet_id: props.timesheetId },
      select: {
        timelog: { select: { duration: true } },
      },
    });
    const totalHours =
      associations.reduce((sum, a) => sum + a.timelog.duration, 0) / 60;
    await tx.erp_hrm_timesheets.update({
      where: { id: props.timesheetId },
      data: {
        total_hours: totalHours,
        updated_at: new Date(),
      },
    });
  });
  // Return updated timesheet
  const updated = await MyGlobal.prisma.erp_hrm_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    ...ErpHrmTimesheetTransformer.select(),
  });
  return ErpHrmTimesheetTransformer.transform(updated);
}
