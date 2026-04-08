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

export async function deleteHrmTimeTrackMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  const employee =
    await MyGlobal.prisma.hrm_time_track_employees.findUniqueOrThrow({
      where: { id: props.employeeId },
      select: {
        id: true,
        hrm_time_track_organization_id: true,
        deleted_at: true,
      },
    });
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee has already been deleted", 400);
  }
  const memberSession =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUnique({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  if (memberSession === null) {
    throw new HttpException("Invalid session", 403);
  }
  if (
    memberSession.hrm_time_track_organization_id !==
    employee.hrm_time_track_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const activeContracts =
    await MyGlobal.prisma.hrm_time_track_employee_contracts.findMany({
      where: {
        hrm_time_track_employee_id: props.employeeId,
        deleted_at: null,
        OR: [{ end_date: null }, { end_date: { gte: new Date() } }],
      },
      select: {
        id: true,
      },
    });
  if (activeContracts.length > 0) {
    throw new HttpException(
      `Cannot delete employee with ${activeContracts.length} active contract(s). Please end all contracts first.`,
      409,
    );
  }
  const pendingTimesheets =
    await MyGlobal.prisma.hrm_time_track_timesheets.findMany({
      where: {
        hrm_time_track_employee_id: props.employeeId,
        deleted_at: null,
        status: { in: ["draft", "submitted"] },
      },
      select: {
        id: true,
      },
    });
  if (pendingTimesheets.length > 0) {
    throw new HttpException(
      `Cannot delete employee with ${pendingTimesheets.length} pending timesheet(s). Please resolve all pending timesheets first.`,
      409,
    );
  }
  await MyGlobal.prisma.hrm_time_track_activity_logs.create({
    data: {
      id: v4(),
      hrm_time_track_organization_id: employee.hrm_time_track_organization_id,
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_employee_id: props.employeeId,
      activity_type: "employee_deactivated",
      description: `Employee ${employee.id} was deactivated by member ${props.member.id}`,
      metadata: JSON.stringify({
        employee_id: employee.id,
        deactivated_by: props.member.id,
      }),
      created_at: new Date(),
    },
  });
  await MyGlobal.prisma.hrm_time_track_employees.update({
    where: { id: props.employeeId },
    data: {
      deleted_at: new Date(),
    },
  });
}
