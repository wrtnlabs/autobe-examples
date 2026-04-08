import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeProject";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTaskHistoryEntry } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTaskHistoryEntry";
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
import { ErpHrmTimeTimesheetTimelogTransformer } from "../transformers/ErpHrmTimeTimesheetTimelogTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimesheetTimelog.ICreate;
}): Promise<IErpHrmTimeTimesheetTimelog> {
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        status: true,
        erp_hrm_time_employee_id: true,
        employee: {
          select: {
            id: true,
            erp_hrm_time_member_id: true,
          },
        },
        week_start_date: true,
        week_end_date: true,
      },
    });
  if (timesheet.employee.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException("Timesheet is not editable", 409);
  }
  const timelog = await MyGlobal.prisma.erp_hrm_time_timelogs.findUniqueOrThrow(
    {
      where: { id: props.body.timelogId },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
        work_date: true,
      },
    },
  );
  if (
    timelog.erp_hrm_time_member_id !== timesheet.employee.erp_hrm_time_member_id
  ) {
    throw new HttpException("Timelog must belong to the same employee", 409);
  }
  if (
    timelog.work_date < timesheet.week_start_date ||
    timelog.work_date > timesheet.week_end_date
  ) {
    throw new HttpException("Timelog must fall within the timesheet week", 409);
  }
  const existing =
    await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.findUnique({
      where: {
        erp_hrm_time_timesheet_id_erp_hrm_time_timelog_id: {
          erp_hrm_time_timesheet_id: props.timesheetId,
          erp_hrm_time_timelog_id: props.body.timelogId,
        },
      },
      select: {
        id: true,
      },
    });
  if (existing !== null) {
    throw new HttpException("Timelog already attached to the timesheet", 409);
  }
  const created = await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.create({
    data: await ErpHrmTimeTimesheetTimelogCollector.collect({
      body: props.body,
      timesheet: {
        id: props.timesheetId,
      },
    }),
    ...ErpHrmTimeTimesheetTimelogTransformer.select(),
  });
  return await ErpHrmTimeTimesheetTimelogTransformer.transform(created);
}
