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

// DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
export async function deleteHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the timesheet (must not be soft-deleted)
  const timesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        employee: {
          select: {
            id: true,
            hrm_time_tracking_member_id: true,
            hrm_time_tracking_organization_id: true,
          },
        },
      },
    });
  if (timesheet === null) {
    throw new HttpException("Timesheet not found", 404);
  }
  // 2. Authorization: own timesheet or time:manage permission
  const isOwnTimesheet =
    timesheet.employee.hrm_time_tracking_member_id === props.member.id;
  let hasTimeManagePermission = false;
  if (!isOwnTimesheet) {
    // Find the requesting member's employee record in the same organization
    const requestingEmployee =
      await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
        where: {
          hrm_time_tracking_member_id: props.member.id,
          hrm_time_tracking_organization_id:
            timesheet.employee.hrm_time_tracking_organization_id,
          deleted_at: null,
        },
        select: {
          id: true,
          hrm_time_tracking_role_id: true,
        },
      });
    if (requestingEmployee !== null) {
      const permission =
        await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
          where: {
            hrm_time_tracking_role_id:
              requestingEmployee.hrm_time_tracking_role_id,
            permission_code: "time:manage",
            deleted_at: null,
          },
        });
      hasTimeManagePermission = permission !== null;
    }
  }
  if (!isOwnTimesheet && !hasTimeManagePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Status validation: only draft or rejected can be deleted
  if (timesheet.status === "submitted" || timesheet.status === "approved") {
    throw new HttpException(
      `Cannot delete a timesheet with status '${timesheet.status}'. Only draft or rejected timesheets can be deleted.`,
      422,
    );
  }
  // 4. Disassociate all timelogs referencing this timesheet
  const now = new Date().toISOString();
  await MyGlobal.prisma.hrm_time_tracking_timelogs.updateMany({
    where: {
      hrm_time_tracking_timesheet_id: props.timesheetId,
    },
    data: {
      hrm_time_tracking_timesheet_id: null,
    },
  });
  // 5. Soft delete the timesheet
  await MyGlobal.prisma.hrm_time_tracking_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      deleted_at: now,
      updated_at: now,
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
// export async function deleteHrmTimeTrackingMemberTimesheetsTimesheetId(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------