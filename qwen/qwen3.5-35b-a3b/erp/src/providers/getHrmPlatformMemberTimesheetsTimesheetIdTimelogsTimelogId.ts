import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimelogTransformer } from "../transformers/HrmPlatformTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimesheetsTimesheetIdTimelogsTimelogId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  timelogId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformTimelog> {
  // Verify the timesheet exists and is active
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
    });
  // Verify the timelog exists and is associated with the timesheet
  // through the junction table with deleted_at is NULL
  const timesheetTimelog =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findFirstOrThrow({
      where: {
        hrm_platform_timesheet_id: props.timesheetId,
        hrm_platform_timelog_id: props.timelogId,
        deleted_at: null,
      },
      include: {
        timelog: true,
      },
    });
  // Verify the timelog is not soft-deleted
  if (timesheetTimelog.timelog.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  // Get the timelog employee and timesheet employee for access control
  const timelogEmployeeId = timesheetTimelog.timelog.employee_id;
  const timesheetEmployeeId = timesheet.hrm_platform_employee_id;
  // Retrieve session to check permissions
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        hrm_platform_member_id: props.member.id,
        expired_at: { gt: toISOStringSafe(new Date()) },
      },
    });
  // Fetch employee record to get role and permissions for access control
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });
  // Check permissions
  const hasTimeManage = employee.role.permissions.some(
    (p) => p.code === "time:manage",
  );
  const hasTimeApprove = employee.role.permissions.some(
    (p) => p.code === "time:approve",
  );
  // Determine if user owns the timelog or timesheet
  const isTimelogOwner = timelogEmployeeId === props.member.id;
  const isTimesheetOwner = timesheetEmployeeId === props.member.id;
  const isOwner = isTimelogOwner || isTimesheetOwner;
  // Access control logic:
  // - time:manage permission: unrestricted access to all timelogs
  // - time:approve permission: access to any timelog in the organization
  // - otherwise: only access to timelogs/timesheets they own
  if (!hasTimeManage && !hasTimeApprove && !isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  // Retrieve the timelog with full data using the transformer
  const record = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow({
    where: {
      id: props.timelogId,
    },
    ...HrmPlatformTimelogTransformer.select(),
  });
  return await HrmPlatformTimelogTransformer.transform(record);
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
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberTimesheetsTimesheetIdTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<IHrmPlatformTimelog> {
//   const record = await MyGlobal.prisma.hrm_platform_timelogs.findFirstOrThrow({
//     ...HrmPlatformTimelogTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformTimelogTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------