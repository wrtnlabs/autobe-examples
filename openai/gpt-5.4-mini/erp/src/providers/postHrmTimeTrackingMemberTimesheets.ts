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

export async function postHrmTimeTrackingMemberTimesheets(props: {
  member: MemberPayload;
  body: IHrmTimeTrackingTimesheet.ICreate;
}): Promise<IHrmTimeTrackingTimesheet> {
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
      where: {
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        userAccount: {
          id: props.member.id,
        },
        organization_id: organization.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const existing = await MyGlobal.prisma.hrm_time_tracking_timesheets.findFirst(
    {
      where: {
        organization_id: organization.id,
        employee_id: employee.id,
        week_start: new Date(props.body.weekStart),
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
        week_start: new Date(props.body.weekStart),
        week_end:
          props.body.weekEnd === undefined || props.body.weekEnd === null
            ? new Date(props.body.weekStart)
            : new Date(props.body.weekEnd),
        status: "draft",
        submitted_at: null,
        reviewed_at: null,
        rejection_reason: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
      ...HrmTimeTrackingTimesheetTransformer.select(),
    });
    if (
      props.body.timelogIds !== undefined &&
      props.body.timelogIds.length > 0
    ) {
      const timelogs = await prisma.hrm_time_tracking_timelogs.findMany({
        where: {
          id: {
            in: props.body.timelogIds,
          },
          organization_id: organization.id,
          employee_id: employee.id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      });
      if (timelogs.length !== props.body.timelogIds.length) {
        throw new HttpException("Invalid timelog inclusion", 400);
      }
      await prisma.hrm_time_tracking_timesheet_timelogs.createMany({
        data: timelogs.map((timelog) => ({
          id: v4(),
          timesheet_id: timesheet.id,
          timelog_id: timelog.id,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
    return timesheet;
  });
  return HrmTimeTrackingTimesheetTransformer.transform(created);
}
