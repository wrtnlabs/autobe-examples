import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployee";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganization";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTask";
import { IErpHrmTimeTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimelog";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { IErpHrmTimeTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTimeTimesheetTimelogCollector } from "../collectors/ErpHrmTimeTimesheetTimelogCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimesheetTransformer } from "../transformers/ErpHrmTimeTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimesheetTimelog.ICreate;
}): Promise<IErpHrmTimeTimesheet> {
  return await MyGlobal.prisma.$transaction(async (prisma) => {
    const employee = await prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
    const timesheet = await prisma.erp_hrm_time_timesheets.findFirst({
      where: {
        id: props.timesheetId,
        erp_hrm_time_employee_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_employee_id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
      },
    });
    if (timesheet === null) {
      throw new HttpException("Timesheet not found", 404);
    }
    if (timesheet.status === "approved") {
      throw new HttpException("Approved timesheets are locked", 400);
    }
    const timelog = await prisma.erp_hrm_time_timelogs.findFirst({
      where: {
        id: props.body.erp_hrm_time_timelog_id,
        erp_hrm_time_member_id: employee.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
        work_date: true,
      },
    });
    if (timelog === null) {
      throw new HttpException("Timelog not found", 404);
    }
    if (
      timelog.work_date < timesheet.week_start_date ||
      timelog.work_date > timesheet.week_end_date
    ) {
      throw new HttpException("Timelog is outside the timesheet week", 400);
    }
    const existingLink = await prisma.erp_hrm_time_timesheet_timelogs.findFirst(
      {
        where: {
          erp_hrm_time_timesheet_id: timesheet.id,
          erp_hrm_time_timelog_id: timelog.id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
    );
    if (existingLink !== null) {
      throw new HttpException(
        "Timelog is already included in the timesheet",
        400,
      );
    }
    const approvedLink = await prisma.erp_hrm_time_timesheet_timelogs.findFirst(
      {
        where: {
          erp_hrm_time_timelog_id: timelog.id,
          deleted_at: null,
          timesheet: {
            status: "approved",
            deleted_at: null,
          },
        },
        select: {
          id: true,
        },
      },
    );
    if (approvedLink !== null) {
      throw new HttpException(
        "Timelog is locked by an approved timesheet",
        400,
      );
    }
    await prisma.erp_hrm_time_timesheet_timelogs.create({
      data: await ErpHrmTimeTimesheetTimelogCollector.collect({
        body: props.body,
        erpHrmTimeTimesheets: {
          id: timesheet.id,
        },
      }),
    });
    const updated = await prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: {
        id: timesheet.id,
      },
      ...ErpHrmTimeTimesheetTransformer.select(),
    });
    return await ErpHrmTimeTimesheetTransformer.transform(updated);
  });
}
