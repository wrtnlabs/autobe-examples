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

export async function deleteHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  const currentMember =
    await MyGlobal.prisma.hrm_time_tracking_members.findUniqueOrThrow({
      where: {
        id: props.member.id,
      },
      select: {
        id: true,
      },
    });
  const currentEmployee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        id: currentMember.id,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        id: props.timesheetId,
        organization_id: currentEmployee.organization_id,
        employee_id: currentEmployee.id,
      },
      select: {
        id: true,
        status: true,
        employee_id: true,
      },
    });
  if (timesheet === null) throw new HttpException("Not Found", 404);
  if (timesheet.employee_id !== currentEmployee.id)
    throw new HttpException("Forbidden", 403);
  if (timesheet.status !== "draft") throw new HttpException("Conflict", 409);
  await MyGlobal.prisma.hrm_time_tracking_timesheet_timelogs.deleteMany({
    where: {
      timesheet_id: timesheet.id,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_timesheets.delete({
    where: {
      id: timesheet.id,
    },
  });
}
