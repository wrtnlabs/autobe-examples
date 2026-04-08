import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformTimesheetTransformer } from "../transformers/HrmPlatformTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmPlatformTimesheet.ITimelogManageRequest;
}): Promise<IHrmPlatformTimesheet> {
  // 1. Fetch timesheet with employee relation for ownership check
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findFirstOrThrow({
      ...HrmPlatformTimesheetTransformer.select(),
      where: {
        id: props.timesheetId,
        deleted_at: null,
      },
    });
  // 2. Validate timesheet status is draft
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 400);
  }
  // 3. Check authorization - owner can modify draft timesheets
  const isOwner: boolean = timesheet.employee.id === props.member.id;
  if (!isOwner) {
    throw new HttpException("Forbidden", 403);
  }
  const adds: (string & tags.Format<"uuid">)[] = props.body.adds ?? [];
  const removes: (string & tags.Format<"uuid">)[] = props.body.removes ?? [];
  // 4. Execute add operations
  if (adds.length > 0) {
    for (const timelogId of adds) {
      // Check timelog exists and is not soft-deleted
      await MyGlobal.prisma.hrm_platform_timelogs.findUniqueOrThrow({
        where: { id: timelogId, deleted_at: null },
      });
      // Check timelog is not already in this timesheet (idempotent)
      const existingInTimesheet =
        await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findFirst({
          where: {
            hrm_platform_timesheet_id: props.timesheetId,
            hrm_platform_timelog_id: timelogId,
            deleted_at: null,
          },
        });
      if (existingInTimesheet !== null) {
        // Already added, skip (idempotent)
        continue;
      }
      // Check timelog is not in an approved timesheet
      const inApprovedTimesheet =
        await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findFirst({
          where: {
            hrm_platform_timelog_id: timelogId,
            deleted_at: null,
            timesheet: {
              status: "approved",
            },
          },
        });
      if (inApprovedTimesheet !== null) {
        throw new HttpException(
          "Timelog is already in an approved timesheet",
          400,
        );
      }
      // Add to timesheet junction table
      await MyGlobal.prisma.hrm_platform_timesheet_timelogs.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          hrm_platform_timesheet_id: props.timesheetId,
          hrm_platform_timelog_id: timelogId,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });
    }
  }
  // 5. Execute remove operations
  if (removes.length > 0) {
    for (const timelogId of removes) {
      // Check timelog is currently in this timesheet
      const existing =
        await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findFirst({
          where: {
            hrm_platform_timesheet_id: props.timesheetId,
            hrm_platform_timelog_id: timelogId,
            deleted_at: null,
          },
        });
      if (existing === null) {
        // Not in timesheet, no-op
        continue;
      }
      // Soft delete the association
      await MyGlobal.prisma.hrm_platform_timesheet_timelogs.update({
        where: { id: existing.id },
        data: { deleted_at: new Date() },
      });
    }
  }
  // 6. Recalculate total_hours from all non-deleted timelogs in this timesheet
  const timelogs =
    await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
      where: {
        hrm_platform_timesheet_id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        timelog: {
          select: { duration_minutes: true },
        },
      },
    });
  const totalMinutes: number = timelogs.reduce(
    (sum: number, t) => sum + t.timelog.duration_minutes,
    0,
  );
  const totalHours: number = totalMinutes / 60;
  // 7. Update timesheet
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: props.timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  // 8. Return transformed timesheet
  return await HrmPlatformTimesheetTransformer.transform(
    await MyGlobal.prisma.hrm_platform_timesheets.findFirstOrThrow({
      ...HrmPlatformTimesheetTransformer.select(),
      where: { id: props.timesheetId, deleted_at: null },
    }),
  );
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
// import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
// import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
// import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchHrmPlatformMemberTimesheetsTimesheetIdTimelogs(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IHrmPlatformTimesheet.ITimelogManageRequest;
// }): Promise<IHrmPlatformTimesheet> {
//   const record = await MyGlobal.prisma.hrm_platform_timesheets.findFirstOrThrow({
//     ...HrmPlatformTimesheetTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformTimesheetTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------