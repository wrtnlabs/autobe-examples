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
  const { member, timesheetId, body } = props;
  const { adds = [], removes = [] } = body;
  if (adds.length === 0 && removes.length === 0) {
    const record =
      await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
        where: { id: timesheetId },
        ...HrmPlatformTimesheetTransformer.select(),
      });
    return await HrmPlatformTimesheetTransformer.transform(record);
  }
  const timesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: timesheetId, deleted_at: null },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  if (timesheet.status !== "pending") {
    throw new HttpException("Cannot modify non-draft timesheet", 400);
  }
  if (timesheet.employee.id !== member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (adds.length > 0) {
    const existingTimelogs =
      await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
        where: {
          hrm_platform_timesheet_id: timesheetId,
          deleted_at: null,
        },
        select: { hrm_platform_timelog_id: true },
      });
    const existingTimelogIds = new Set(
      existingTimelogs.map((t) => t.hrm_platform_timelog_id),
    );
    const timelogRecords = await MyGlobal.prisma.hrm_platform_timelogs.findMany(
      {
        where: {
          id: { in: adds },
        },
        select: { id: true },
      },
    );
    const validTimelogIds = new Set(timelogRecords.map((t) => t.id));
    const toAdd = adds.filter(
      (id) => !existingTimelogIds.has(id) && validTimelogIds.has(id),
    );
    for (const timelogId of toAdd) {
      const existingInApproved =
        await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
          where: {
            timelogs: {
              some: {
                hrm_platform_timelog_id: timelogId,
                deleted_at: null,
              },
            },
            status: "approved",
          },
        });
      if (existingInApproved !== null) {
        throw new HttpException(
          "Timelog is part of an approved timesheet",
          400,
        );
      }
      await MyGlobal.prisma.hrm_platform_timesheet_timelogs.create({
        data: {
          id: v4(),
          hrm_platform_timesheet_id: timesheetId,
          hrm_platform_timelog_id: timelogId,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
  }
  if (removes.length > 0) {
    const existingRelations =
      await MyGlobal.prisma.hrm_platform_timesheet_timelogs.findMany({
        where: {
          hrm_platform_timesheet_id: timesheetId,
          hrm_platform_timelog_id: { in: removes },
          deleted_at: null,
        },
        select: { hrm_platform_timelog_id: true },
      });
    const existingRelationIds = new Set(
      existingRelations.map((r) => r.hrm_platform_timelog_id),
    );
    const toRemove = removes.filter((id) => existingRelationIds.has(id));
    for (const timelogId of toRemove) {
      const existingInApproved =
        await MyGlobal.prisma.hrm_platform_timesheets.findFirst({
          where: {
            timelogs: {
              some: {
                hrm_platform_timelog_id: timelogId,
                deleted_at: null,
              },
            },
            status: "approved",
          },
        });
      if (existingInApproved !== null) {
        throw new HttpException(
          "Cannot remove timelog from approved timesheet",
          400,
        );
      }
      await MyGlobal.prisma.hrm_platform_timesheet_timelogs.updateMany({
        where: {
          hrm_platform_timesheet_id: timesheetId,
          hrm_platform_timelog_id: timelogId,
        },
        data: { deleted_at: new Date() },
      });
    }
  }
  const timelogs = await MyGlobal.prisma.hrm_platform_timelogs.findMany({
    where: {
      id: {
        in: [...timesheet.timelogs.map((t) => t.timelog.id)],
      },
    },
    select: {
      id: true,
      duration_minutes: true,
    },
  });
  const totalMinutes = timelogs.reduce((sum, t) => sum + t.duration_minutes, 0);
  const totalHours = totalMinutes / 60;
  await MyGlobal.prisma.hrm_platform_timesheets.update({
    where: { id: timesheetId },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  const updatedTimesheet =
    await MyGlobal.prisma.hrm_platform_timesheets.findUniqueOrThrow({
      where: { id: timesheetId },
      ...HrmPlatformTimesheetTransformer.select(),
    });
  return await HrmPlatformTimesheetTransformer.transform(updatedTimesheet);
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