import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingProject";
import { IHrmTimeTrackingTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTask";
import { IHrmTimeTrackingTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimelog";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { HrmTimeTrackingTimesheetCollector } from "../collectors/HrmTimeTrackingTimesheetCollector";
import { EmployeePayload } from "../decorators/payload/EmployeePayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingEmployeeTimesheets(props: {
  employee: EmployeePayload;
  body: IHrmTimeTrackingTimesheet.ICreate;
}): Promise<IHrmTimeTrackingTimesheet> {
  const employee = await MyGlobal.prisma.hrm_time_tracking_employees.findFirst({
    where: {
      id: props.employee.id,
      deleted_at: null,
      sessions: {
        some: {
          id: props.employee.session_id,
          logged_out_at: null,
          expired_at: {
            gt: new globalThis.Date(),
          },
        },
      },
    },
    select: {
      id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  const session =
    await MyGlobal.prisma.hrm_time_tracking_employee_sessions.findFirst({
      where: {
        id: props.employee.session_id,
        hrm_time_tracking_employee_id: employee.id,
        logged_out_at: null,
        expired_at: {
          gt: new globalThis.Date(),
        },
      },
      select: {
        hrm_time_tracking_organization_id: true,
      },
    });
  if (session === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (session.hrm_time_tracking_organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  const organizationId = session.hrm_time_tracking_organization_id;
  const weekStartInstant = new globalThis.Date(props.body.week_start_date);
  if (Number.isNaN(weekStartInstant.getTime()) === true) {
    throw new HttpException("Invalid week_start_date", 400);
  }
  if (
    weekStartInstant.getUTCDay() !== 1 ||
    weekStartInstant.getUTCHours() !== 0 ||
    weekStartInstant.getUTCMinutes() !== 0 ||
    weekStartInstant.getUTCSeconds() !== 0 ||
    weekStartInstant.getUTCMilliseconds() !== 0
  ) {
    throw new HttpException("week_start_date must be the Monday boundary", 400);
  }
  const weekStartDate = new globalThis.Date(weekStartInstant.getTime());
  const weekEndDate = new globalThis.Date(
    weekStartInstant.getTime() + 6 * 24 * 60 * 60 * 1000,
  );
  const weekEndExclusiveDate = new globalThis.Date(
    weekStartInstant.getTime() + 7 * 24 * 60 * 60 * 1000,
  );
  const existing = await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst(
    {
      where: {
        hrm_time_tracking_employee_id: employee.id,
        week_start_date: weekStartDate,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    },
  );
  if (existing !== null) {
    throw new HttpException("Timesheet already exists for this week", 409);
  }
  try {
    const created = await MyGlobal.prisma.$transaction(async (tx) => {
      const now = new globalThis.Date();
      const timesheet = await tx.hrm_time_tracking_timesheets.create({
        data: {
          ...(await HrmTimeTrackingTimesheetCollector.collect({
            body: {
              week_start_date: toISOStringSafe(weekStartDate),
            },
            organization: {
              id: organizationId,
            },
            employee: {
              id: employee.id,
            },
          })),
          week_start_date: weekStartDate,
          week_end_date: weekEndDate,
          created_at: now,
          updated_at: now,
        },
      });
      const eligibleTimelogs = await tx.hrm_time_tracking_timelogs.findMany({
        where: {
          hrm_time_tracking_organization_id: organizationId,
          hrm_time_tracking_employee_id: employee.id,
          worked_on: {
            gte: weekStartDate,
            lt: weekEndExclusiveDate,
          },
          deleted_at: null,
          timesheetTimelog: null,
        },
        select: {
          id: true,
        },
      });
      for (const timelog of eligibleTimelogs) {
        await tx.hrm_time_tracking_timesheet_timelogs.create({
          data: {
            id: v4(),
            timesheet: {
              connect: {
                id: timesheet.id,
              },
            },
            timelog: {
              connect: {
                id: timelog.id,
              },
            },
            created_at: now,
            updated_at: now,
            deleted_at: null,
          },
        });
      }
      return await tx.hrm_time_tracking_timesheets.findUniqueOrThrow({
        where: {
          id: timesheet.id,
        },
        ...HrmTimeTrackingTimesheetTransformer.select(),
      });
    });
    return await HrmTimeTrackingTimesheetTransformer.transform(created);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new HttpException("Timesheet already exists for this week", 409);
    }
    throw error;
  }
}
