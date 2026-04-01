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

export async function deleteHrmsMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timesheet = await MyGlobal.prisma.hrms_timesheets.findUniqueOrThrow({
    where: { id: props.timesheetId },
    select: {
      id: true,
      hrms_employee_id: true,
      status: true,
      deleted_at: true,
      week_start_date: true,
      week_end_date: true,
    },
  });
  if (timesheet.deleted_at !== null) {
    throw new HttpException("Timesheet not found", 404);
  }
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException("Forbidden", 403);
  }
  const memberMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        organizationRole: {
          include: {
            permissions: true,
          },
        },
      },
    });
  if (memberMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const employeeMembership = await MyGlobal.prisma.hrms_employees.findFirst({
    where: { id: timesheet.hrms_employee_id },
    select: {
      organization_member_id: true,
    },
  });
  if (employeeMembership === null) {
    throw new HttpException("Timesheet not found", 404);
  }
  const isSelf =
    memberMembership.id === employeeMembership.organization_member_id;
  if (!isSelf) {
    const employeeOrganizationMembership =
      await MyGlobal.prisma.hrms_organization_members.findFirst({
        where: {
          id: employeeMembership.organization_member_id,
          hrms_organization_id: memberMembership.hrms_organization_id,
        },
      });
    if (employeeOrganizationMembership === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const hasTimeManagePermission =
    memberMembership.organizationRole.permissions.some(
      (permission: { permission: string }) =>
        permission.permission === "time:manage",
    );
  if (!hasTimeManagePermission && !isSelf) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrms_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  await MyGlobal.prisma.hrms_timelogs.updateMany({
    where: {
      employee_id: timesheet.hrms_employee_id,
      date: {
        gte: timesheet.week_start_date,
        lte: timesheet.week_end_date,
      },
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
