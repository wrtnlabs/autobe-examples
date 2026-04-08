import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { IErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeTimesheet";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmTimeTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmTimeTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimesheetAtSummaryTransformer } from "../transformers/ErpHrmTimeTimesheetAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimesheet.ITimelogUpdate;
}): Promise<IPageIErpHrmTimeTimesheet.ISummary> {
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: {
        id: props.timesheetId,
      },
      select: {
        id: true,
        erp_hrm_time_employee_id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        employee: {
          select: {
            id: true,
            erp_hrm_time_organization_id: true,
          },
        },
      },
    });
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException("Timesheet is not editable", 400);
  }
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: timesheet.erp_hrm_time_employee_id,
        erp_hrm_time_organization_id:
          timesheet.employee.erp_hrm_time_organization_id,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
      },
    });
  if (
    employee.erp_hrm_time_organization_id !==
    timesheet.employee.erp_hrm_time_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  const start = timesheet.week_start_date;
  const end = timesheet.week_end_date;
  const addIds = props.body.addTimelogIds ?? [];
  const removeIds = props.body.removeTimelogIds ?? [];
  const linked = await MyGlobal.prisma.erp_hrm_time_timesheet_timelogs.findMany(
    {
      where: {
        erp_hrm_time_timesheet_id: timesheet.id,
      },
      select: {
        erp_hrm_time_timelog_id: true,
      },
    },
  );
  const linkedIds = new Set(linked.map((item) => item.erp_hrm_time_timelog_id));
  await MyGlobal.prisma.$transaction(async (tx) => {
    if (removeIds.length > 0) {
      const removable = await tx.erp_hrm_time_timesheet_timelogs.findMany({
        where: {
          erp_hrm_time_timesheet_id: timesheet.id,
          erp_hrm_time_timelog_id: { in: removeIds },
        },
        select: {
          erp_hrm_time_timelog_id: true,
        },
      });
      if (removable.length !== removeIds.length) {
        throw new HttpException(
          "Some timelogs are not attached to the timesheet",
          400,
        );
      }
      await tx.erp_hrm_time_timesheet_timelogs.deleteMany({
        where: {
          erp_hrm_time_timesheet_id: timesheet.id,
          erp_hrm_time_timelog_id: { in: removeIds },
        },
      });
    }
    if (addIds.length > 0) {
      const timelogs = await tx.erp_hrm_time_timelogs.findMany({
        where: {
          id: { in: addIds },
        },
        select: {
          id: true,
          erp_hrm_time_member_id: true,
          work_date: true,
        },
      });
      if (timelogs.length !== addIds.length) {
        throw new HttpException("Some timelogs were not found", 400);
      }
      const candidates = timelogs.filter(
        (timelog) => !linkedIds.has(timelog.id),
      );
      for (const timelog of candidates) {
        if (timelog.erp_hrm_time_member_id !== props.member.id) {
          throw new HttpException(
            "Timelog does not belong to the timesheet employee",
            400,
          );
        }
        if (timelog.work_date < start || timelog.work_date > end) {
          throw new HttpException("Timelog is outside the timesheet week", 400);
        }
      }
      const locked = await tx.erp_hrm_time_timesheet_timelogs.findMany({
        where: {
          erp_hrm_time_timelog_id: { in: addIds },
          timesheet: {
            status: "approved",
          },
        },
        select: {
          erp_hrm_time_timelog_id: true,
        },
      });
      if (locked.length > 0) {
        throw new HttpException(
          "Some timelogs are locked by an approved timesheet",
          400,
        );
      }
      for (const timelog of candidates) {
        if (!linkedIds.has(timelog.id)) {
          await tx.erp_hrm_time_timesheet_timelogs.create({
            data: {
              id: v4(),
              erp_hrm_time_timesheet_id: timesheet.id,
              erp_hrm_time_timelog_id: timelog.id,
              created_at: new Date(),
              updated_at: new Date(),
            },
          });
        }
      }
    }
    await tx.erp_hrm_time_timesheets.update({
      where: { id: timesheet.id },
      data: { updated_at: new Date() },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: timesheet.id },
      ...ErpHrmTimeTimesheetAtSummaryTransformer.select(),
    });
  return {
    pagination: {
      current: 1,
      limit: 1,
      records: 1,
      pages: 1,
    },
    data: [await ErpHrmTimeTimesheetAtSummaryTransformer.transform(updated)],
  };
}
