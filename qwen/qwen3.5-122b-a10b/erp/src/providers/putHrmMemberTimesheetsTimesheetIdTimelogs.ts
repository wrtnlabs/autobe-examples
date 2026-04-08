import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimesheetTimelogTransformer } from "../transformers/HrmTimesheetTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IHrmTimesheetTimelog.ITimelogUpdate;
}): Promise<IHrmTimesheetTimelog> {
  const employee = await MyGlobal.prisma.hrm_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  const timesheet = await MyGlobal.prisma.hrm_timesheets.findFirst({
    where: {
      id: props.timesheetId,
      hrm_employee_id: employee.id,
      deleted_at: null,
    },
  });
  if (!timesheet) {
    throw new HttpException("Timesheet not found", 404);
  }
  if (timesheet.status !== "draft") {
    throw new HttpException("Timesheet is not in draft status", 409);
  }
  const addTimelogIds = props.body.add_timelog_ids;
  if (addTimelogIds.length > 0) {
    const timelogs = await MyGlobal.prisma.hrm_timelogs.findMany({
      where: {
        id: {
          in: addTimelogIds,
        },
        hrm_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
        date: true,
      },
    });
    if (timelogs.length !== addTimelogIds.length) {
      throw new HttpException(
        "Some timelogs not found or do not belong to you",
        400,
      );
    }
    for (const timelog of timelogs) {
      if (
        timelog.date < timesheet.week_start_date ||
        timelog.date > timesheet.week_end_date
      ) {
        throw new HttpException(
          `Timelog ${timelog.id} date is outside the timesheet week range`,
          400,
        );
      }
    }
    const lockedTimelogs =
      await MyGlobal.prisma.hrm_timesheet_timelogs.findMany({
        where: {
          timelog_id: {
            in: addTimelogIds,
          },
          deleted_at: null,
          timesheet: {
            status: {
              in: ["submitted", "approved"],
            },
          },
        },
        select: {
          timelog_id: true,
        },
      });
    if (lockedTimelogs.length > 0) {
      throw new HttpException(
        "Some timelogs are locked by submitted or approved timesheets",
        409,
      );
    }
    const existingAssociations =
      await MyGlobal.prisma.hrm_timesheet_timelogs.findMany({
        where: {
          timesheet_id: props.timesheetId,
          timelog_id: {
            in: addTimelogIds,
          },
          deleted_at: null,
        },
        select: {
          timelog_id: true,
        },
      });
    const existingTimelogIds = new Set(
      existingAssociations.map((a) => a.timelog_id),
    );
    const newTimelogIds = addTimelogIds.filter(
      (id) => !existingTimelogIds.has(id),
    );
    if (newTimelogIds.length > 0) {
      await MyGlobal.prisma.hrm_timesheet_timelogs.createMany({
        data: newTimelogIds.map((timelogId) => ({
          id: typia.random<string & tags.Format<"uuid">>(),
          timesheet_id: props.timesheetId,
          timelog_id: timelogId,
          created_at: new Date(),
          updated_at: new Date(),
        })),
        skipDuplicates: true,
      });
    }
  }
  const removeTimelogIds = props.body.remove_timelog_ids;
  if (removeTimelogIds.length > 0) {
    const currentAssociations =
      await MyGlobal.prisma.hrm_timesheet_timelogs.findMany({
        where: {
          timesheet_id: props.timesheetId,
          timelog_id: {
            in: removeTimelogIds,
          },
          deleted_at: null,
        },
        select: {
          id: true,
          timelog_id: true,
        },
      });
    if (currentAssociations.length > 0) {
      const lockedTimelogs =
        await MyGlobal.prisma.hrm_timesheet_timelogs.findMany({
          where: {
            timelog_id: {
              in: currentAssociations.map((a) => a.timelog_id),
            },
            deleted_at: null,
            timesheet: {
              status: {
                in: ["submitted", "approved"],
              },
            },
          },
          select: {
            timelog_id: true,
          },
        });
      if (lockedTimelogs.length > 0) {
        throw new HttpException(
          "Some timelogs are locked by submitted or approved timesheets",
          409,
        );
      }
      await MyGlobal.prisma.hrm_timesheet_timelogs.updateMany({
        where: {
          id: {
            in: currentAssociations.map((a) => a.id),
          },
        },
        data: {
          deleted_at: new Date(),
        },
      });
    }
  }
  const remainingTimelogIds =
    await MyGlobal.prisma.hrm_timesheet_timelogs.findMany({
      where: {
        timesheet_id: props.timesheetId,
        deleted_at: null,
      },
      select: {
        timelog_id: true,
      },
    });
  const timelogDurations = await MyGlobal.prisma.hrm_timelogs.findMany({
    where: {
      id: {
        in: remainingTimelogIds.map((r) => r.timelog_id),
      },
      deleted_at: null,
    },
    select: {
      duration_minutes: true,
    },
  });
  const totalMinutes = timelogDurations.reduce(
    (sum, t) => sum + t.duration_minutes,
    0,
  );
  const totalHours = totalMinutes / 60;
  await MyGlobal.prisma.hrm_timesheets.update({
    where: {
      id: props.timesheetId,
    },
    data: {
      total_hours: totalHours,
      updated_at: new Date(),
    },
  });
  const updated = await MyGlobal.prisma.hrm_timesheets.findUniqueOrThrow({
    where: {
      id: props.timesheetId,
    },
    ...HrmTimesheetTimelogTransformer.select(),
  });
  return await HrmTimesheetTimelogTransformer.transform(updated);
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
// import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
// import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
// import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
// import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
// import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
// import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
// import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
// import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
// import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
// import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putHrmMemberTimesheetsTimesheetIdTimelogs(props: {
//   member: MemberPayload;
//   timesheetId: string & tags.Format<"uuid">;
//   body: IHrmTimesheetTimelog.ITimelogUpdate;
// }): Promise<IHrmTimesheetTimelog> {
//   await MyGlobal.prisma.hrm_timesheets.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.hrm_timesheets.findUniqueOrThrow({
//     where: { ... },
//     ...HrmTimesheetTimelogTransformer.select(),
//   });
//   return await HrmTimesheetTimelogTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------