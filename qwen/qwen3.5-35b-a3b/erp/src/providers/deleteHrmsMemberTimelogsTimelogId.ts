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
  // 1. Lookup timelog by id
  const timelog = await MyGlobal.prisma.hrms_timelogs.findUnique({
    where: { id: props.timelogId },
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found", 404);
  }
  // 2. Check if timelog is already deleted (soft delete)
  if (timelog.deleted_at !== null) {
    throw new HttpException("Timelog already deleted", 404);
  }
  // 3. Retrieve employee record to check active status
  const employee = await MyGlobal.prisma.hrms_employees.findUnique({
    where: { id: timelog.employee_id },
  });
  if (employee === null || employee.status !== "active") {
    throw new HttpException("Employee is deactivated", 404);
  }
  // 4. Check timelog ownership
  const isOwner = timelog.employee_id === props.member.id;
  // 5. Verify time:manage permission if not owner
  // Need to get all organization memberships for this member and check permissions
  const memberRoles = await MyGlobal.prisma.hrms_organization_members.findMany({
    where: {
      hrms_member_id: props.member.id,
      deleted_at: null,
    },
    include: {
      organizationRole: {
        include: {
          permissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  const hasManagePermission = memberRoles.some((membership) =>
    membership.organizationRole?.permissions.some(
      (perm: { permission: string }) => perm.permission === "time:manage",
    ),
  );
  if (!isOwner && !hasManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 6. Query timesheets to find any containing this timelog
  // Get all timesheets with status submitted or approved for this employee
  const timesheetsWithTimelog = await MyGlobal.prisma.hrms_timesheets.findMany({
    where: {
      hrms_employee_id: timelog.employee_id,
      status: {
        in: ["submitted", "approved"],
      },
    },
  });
  if (timesheetsWithTimelog.length > 0) {
    const foundTimesheet = timesheetsWithTimelog[0];
    throw new HttpException(
      `Timelog is part of a ${foundTimesheet.status} timesheet`,
      409,
    );
  }
  // 7. Execute soft delete
  await MyGlobal.prisma.hrms_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
}
