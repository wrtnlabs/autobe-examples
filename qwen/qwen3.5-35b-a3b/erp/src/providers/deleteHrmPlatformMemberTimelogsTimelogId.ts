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
  // 1. Verify timelog exists and check if already deleted
  const timelog = await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow(
    {
      where: { id: props.timelogId },
      select: {
        id: true,
        employee_id: true,
        deleted_at: true,
      },
    },
  );
  // If already deleted, treat as 404
  if (timelog.deleted_at !== null) {
    throw new HttpException("Not found", 404);
  }
  // 2. Get organization from employee
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: timelog.employee_id },
      select: {
        organization: {
          select: { id: true },
        },
      },
    });
  // 3. Authorization check - only allow deletion of own timelogs
  if (timelog.employee_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Check timesheet associations
  const timesheetTimelogs =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
      where: {
        hrm_platform_timelog_id: props.timelogId,
        deleted_at: null,
      },
      include: {
        timesheet: {
          select: { status: true },
        },
        timelog: {
          select: { employee_id: true },
        },
      },
    });
  // Check if any associated timesheet has status submitted or approved
  for (const timesheetTimelog of timesheetTimelogs) {
    if (timesheetTimelog.deleted_at !== null) continue;
    const status = timesheetTimelog.timesheet.status as string;
    if (status === "submitted" || status === "approved") {
      throw new HttpException("Conflict", 409);
    }
  }
  // 5. Transaction: soft delete and log activity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the timelog
    await tx.hrm_platform_timelogs.update({
      where: { id: props.timelogId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    // Log the deletion in activity_logs
    const activityId: string & tags.Format<"uuid"> = v4();
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: activityId,
        member_id: props.member.id,
        organization_id: employee.organization.id,
        entity_type: "timelog",
        entity_id: props.timelogId,
        action_type: "delete",
        action_name: "timelog.delete",
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
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