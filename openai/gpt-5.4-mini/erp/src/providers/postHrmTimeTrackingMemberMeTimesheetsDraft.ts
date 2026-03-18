import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingTimesheet";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingTimesheetTransformer } from "../transformers/HrmTimeTrackingTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberMeTimesheetsDraft(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimesheet.ICreate;
}): Promise<IHrmTimeTrackingTimesheet> {
  const weekStart: string = props.body.weekStart;
  const weekEnd: string = props.body.weekEnd ?? props.body.weekStart;
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
        name: true,
        description: true,
        logo_image_url: true,
        currency: true,
        timezone: true,
        fiscal_start_month: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        deleted_at: null,
        organization_id: organization.id,
        user_account_id: props.member.id,
      },
      select: {
        id: true,
        organization_id: true,
        user_account_id: true,
        role_id: true,
        department_id: true,
        position_title: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const existingTimesheet =
    await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst({
      where: {
        deleted_at: null,
        organization_id: organization.id,
        employee_id: employee.id,
        week_start: weekStart,
        status: {
          in: ["submitted", "approved"],
        },
      },
      select: {
        id: true,
      },
    });
  if (existingTimesheet !== null) {
    throw new HttpException(
      "Timesheet already exists for this employee and week.",
      409,
    );
  }
  const timelogs = await MyGlobal.prisma.hrm_time_tracking_timelogs.findMany({
    where: {
      deleted_at: null,
      organization_id: organization.id,
      employee_id: employee.id,
      work_date: {
        gte: weekStart,
        lte: weekEnd,
      },
    },
    select: {
      id: true,
      organization_id: true,
      employee_id: true,
    },
  });
  const invalidTimelog = timelogs.find(
    (timelog) =>
      timelog.organization_id !== organization.id ||
      timelog.employee_id !== employee.id,
  );
  if (invalidTimelog !== undefined) {
    throw new HttpException("Cannot include foreign timelogs.", 400);
  }
  const created = await MyGlobal.prisma.$transaction(async (prisma) => {
    const timesheet = await prisma.hrm_time_tracking_timesheets.create({
      data: {
        id: v4(),
        organization: {
          connect: {
            id: organization.id,
          },
        },
        employee: {
          connect: {
            id: employee.id,
          },
        },
        week_start: weekStart,
        week_end: weekEnd,
        status: "draft",
        submitted_at: null,
        reviewed_at: null,
        rejection_reason: null,
        created_at: new Date(props.body.weekStart),
        updated_at: new Date(props.body.weekStart),
        deleted_at: null,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
    if (timelogs.length !== 0) {
      await prisma.hrm_time_tracking_timesheet_timelogs.createMany({
        data: timelogs.map((timelog) => ({
          id: v4(),
          timesheet_id: timesheet.id,
          timelog_id: timelog.id,
          created_at: new Date(props.body.weekStart),
          updated_at: new Date(props.body.weekStart),
          deleted_at: null,
        })),
      });
    }
    return timesheet;
  });
  return await HrmTimeTrackingTimesheetTransformer.transform(created);
}
