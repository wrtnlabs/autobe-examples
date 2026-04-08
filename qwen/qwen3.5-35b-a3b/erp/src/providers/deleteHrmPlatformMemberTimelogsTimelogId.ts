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

export async function deleteHrmPlatformMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUnique({
    where: { id: props.timelogId },
    select: {
      id: true,
      employee_id: true,
      project_id: true,
      task_id: true,
      start_datetime: true,
      end_datetime: true,
      duration_minutes: true,
      description: true,
      billable: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      project: {
        select: {
          organization_id: true,
        },
      },
    },
  });
  if (timelog === null || timelog.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  if (timelog.project === null) {
    throw new HttpException("Not Found", 404);
  }
  const organizationId = timelog.project.organization_id;
  const allSessions =
    await MyGlobal.prisma.hrm_platform_member_sessions.findMany({
      where: {
        hrm_platform_member_id: props.member.id,
        expired_at: { gt: new Date() },
        organization_id: organizationId,
      },
      select: {
        organization_id: true,
      },
    });
  const hasActiveSession = allSessions.length > 0;
  if (!hasActiveSession) {
    throw new HttpException("Forbidden", 403);
  }
  const timeManagePermission =
    await MyGlobal.prisma.hrm_platform_permissions.findFirst({
      where: {
        code: "time:manage",
        organization_id: organizationId,
      },
      select: { id: true },
    });
  const isTimeManageAllowed = timeManagePermission !== null;
  if (!isTimeManageAllowed) {
    const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_member_id: props.member.id,
        hrm_platform_organization_id: organizationId,
      },
      select: { id: true },
    });
    if (employee === null) {
      throw new HttpException("Forbidden", 403);
    }
    if (timelog.employee_id !== employee.id) {
      throw new HttpException("Forbidden", 403);
    }
  }
  const timesheetTimelogs =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
      where: {
        hrm_platform_timelog_id: props.timelogId,
        deleted_at: null,
      },
      select: { hrm_platform_timesheet_id: true },
    });
  if (timesheetTimelogs.length > 0) {
    const timesheetIds = timesheetTimelogs.map(
      (tt) => tt.hrm_platform_timesheet_id,
    );
    const timesheets = await MyGlobal.prisma.hrm_platform_timesheets.findMany({
      where: {
        id: { in: timesheetIds },
        status: { in: ["submitted", "approved"] },
      },
      select: { id: true },
    });
    if (timesheets.length > 0) {
      throw new HttpException("Conflict", 409);
    }
  }
  await MyGlobal.prisma.hrm_platform_timelogs.update({
    where: { id: props.timelogId },
    data: { deleted_at: new Date() },
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      organization_id: organizationId,
      entity_type: "timelog",
      entity_id: props.timelogId,
      action_type: "delete",
      action_name: "timelog.delete",
      extra_data: null,
      created_at: new Date(),
      updated_at: new Date(),
    },
  });
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function deleteHrmPlatformMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------