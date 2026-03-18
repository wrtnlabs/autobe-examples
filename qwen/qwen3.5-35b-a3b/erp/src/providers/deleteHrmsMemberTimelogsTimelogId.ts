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

export async function deleteHrmsMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the timelog
  const timelog = await MyGlobal.prisma.hrms_timelogs.findUnique({
    where: { id: props.timelogId },
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
  // Step 2: Get employee to check active status
  const employee = await MyGlobal.prisma.hrms_employees.findUnique({
    where: { id: timelog.employee_id },
    select: { id: true, status: true },
  });
  if (employee === null || employee.status !== "active") {
    throw new HttpException("Timelog not found", 404);
  }
  // Step 3: Check ownership
  const isOwner = timelog.employee_id === props.member.id;
  // Step 4: Check permission override if not owner
  if (!isOwner) {
    const organizationMember =
      await MyGlobal.prisma.hrms_organization_members.findFirst({
        where: {
          hrms_member_id: props.member.id,
          deleted_at: null,
        },
        select: {
          hrms_organization_role_id: true,
        },
      });
    if (organizationMember === null) {
      throw new HttpException("You're not enrolled", 403);
    }
    const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
      where: {
        id: organizationMember.hrms_organization_role_id,
      },
      select: {
        id: true,
      },
    });
    if (role === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 5: Check timesheet lock by finding timesheets for the employee that are submitted or approved
  // A timelog belongs to a timesheet if it was created during that timesheet's week
  const timesheets = await MyGlobal.prisma.hrms_timesheets.findMany({
    where: {
      hrms_employee_id: timelog.employee_id,
      status: { in: ["submitted", "approved"] },
    },
    select: {
      id: true,
      week_start_date: true,
      week_end_date: true,
    },
  });
  const timelogDateOnly = new Date(timelog.date);
  timelogDateOnly.setHours(0, 0, 0, 0);
  const hasTimelogInTimesheet = timesheets.some((ts) => {
    const tsStartDate = new Date(ts.week_start_date);
    tsStartDate.setHours(0, 0, 0, 0);
    const tsEndDate = new Date(ts.week_end_date);
    tsEndDate.setHours(23, 59, 59, 999);
    return timelogDateOnly >= tsStartDate && timelogDateOnly <= tsEndDate;
  });
  if (hasTimelogInTimesheet) {
    throw new HttpException(
      "Cannot delete timelog in submitted or approved timesheet",
      409,
    );
  }
  // Step 6: Soft delete
  await MyGlobal.prisma.hrms_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Step 7: Return 204 No Content (void return type)
}
