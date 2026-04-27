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

export async function deleteHrmTimeTrackingMemberTimelogsTimelogId(props: {
  member: MemberPayload;
  timelogId: string & tags.Format<"uuid">;
}): Promise<void> {
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      hrm_time_tracking_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee record not found", 404);
  }
  const timelog = await MyGlobal.prisma.hrm_time_tracking_timelogs.findFirst({
    where: {
      id: props.timelogId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_tracking_employee_id: true,
      hrm_time_tracking_timesheet_id: true,
    },
  });
  if (timelog === null) {
    throw new HttpException("Timelog not found or already deleted", 404);
  }
  const isOwner: boolean =
    timelog.hrm_time_tracking_employee_id === employee.id;
  if (isOwner === false) {
    const permission =
      await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
        where: {
          hrm_time_tracking_role_id: employee.hrm_time_tracking_role_id,
          permission_code: "time:manage",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (permission === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  if (timelog.hrm_time_tracking_timesheet_id !== null) {
    const timesheet =
      await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
        where: {
          id: timelog.hrm_time_tracking_timesheet_id,
          deleted_at: null,
        },
        select: { status: true },
      });
    if (timesheet === null) {
      throw new HttpException("Associated timesheet not found", 404);
    }
    if (timesheet.status === "submitted" || timesheet.status === "approved") {
      throw new HttpException(
        "Cannot delete a timelog that belongs to a submitted or approved timesheet",
        422,
      );
    }
  }
  const now: string = toISOStringSafe(new Date());
  await MyGlobal.prisma.hrm_time_tracking_timelogs.update({
    where: { id: props.timelogId },
    data: {
      deleted_at: now,
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
// export async function deleteHrmTimeTrackingMemberTimelogsTimelogId(props: {
//   member: MemberPayload;
//   timelogId: string & tags.Format<"uuid">;
// }): Promise<void> {
//   await MyGlobal.prisma.....delete({
//     where: { ... },
//   });
// }
// ```
//--------------------------------------------------------------