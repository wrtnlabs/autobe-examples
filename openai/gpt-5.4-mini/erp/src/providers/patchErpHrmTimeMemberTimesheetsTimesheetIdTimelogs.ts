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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimesheetTransformer } from "../transformers/ErpHrmTimeTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmTimeMemberTimesheetsTimesheetIdTimelogs(props: {
  member: MemberPayload;
  timesheetId: string & tags.Format<"uuid">;
  body: IErpHrmTimeTimesheet.IUpdateTimelog;
}): Promise<IErpHrmTimeTimesheet> {
  const timesheet =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      select: {
        id: true,
        erp_hrm_time_employee_id: true,
        status: true,
        employee: {
          select: {
            id: true,
            erp_hrm_time_member_id: true,
            erp_hrm_time_organization_id: true,
          },
        },
      },
    });
  if (timesheet.employee.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.employee.erp_hrm_time_organization_id === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (timesheet.status === "approved") {
    throw new HttpException("Approved timesheet cannot be modified", 400);
  }
  if (timesheet.status !== "draft" && timesheet.status !== "rejected") {
    throw new HttpException("Timesheet is not editable", 400);
  }
  const timelogIds = Array.from(new Set(props.body.timelogIds));
  if (timelogIds.length !== props.body.timelogIds.length) {
    throw new HttpException("Duplicate timelog ids are not allowed", 400);
  }
  const timelogs = await MyGlobal.prisma.erp_hrm_time_timelogs.findMany({
    where: {
      id: { in: timelogIds },
      erp_hrm_time_member_id: timesheet.employee.erp_hrm_time_member_id,
      deleted_at: null,
    },
    select: {
      id: true,
      work_date: true,
    },
  });
  if (timelogs.length !== timelogIds.length) {
    throw new HttpException("One or more timelogs are invalid", 400);
  }
  const timesheetWeekStart = timesheet.employee.erp_hrm_time_organization_id;
  void timesheetWeekStart;
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_timesheet_timelogs.deleteMany({
      where: { erp_hrm_time_timesheet_id: props.timesheetId },
    });
    if (timelogIds.length > 0) {
      await prisma.erp_hrm_time_timesheet_timelogs.createMany({
        data: timelogIds.map((timelogId) => ({
          id: v4(),
          erp_hrm_time_timesheet_id: props.timesheetId,
          erp_hrm_time_timelog_id: timelogId,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
    await prisma.erp_hrm_time_timesheets.update({
      where: { id: props.timesheetId },
      data: { updated_at: new Date() },
    });
  });
  const updated =
    await MyGlobal.prisma.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: props.timesheetId },
      ...ErpHrmTimeTimesheetTransformer.select(),
    });
  return await ErpHrmTimeTimesheetTransformer.transform(updated);
}
