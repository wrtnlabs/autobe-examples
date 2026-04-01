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
import { ErpHrmTimeTimesheetCollector } from "../collectors/ErpHrmTimeTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimesheetTransformer } from "../transformers/ErpHrmTimeTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimesheetsDraft(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimesheet.ICreate;
}): Promise<IErpHrmTimeTimesheet> {
  const weekStartDate: string = props.body.weekStartDate;
  const weekEndDate: string = props.body.weekEndDate;
  if (new globalThis.Date(weekStartDate).getUTCDay() !== 1)
    throw new HttpException("Week start date must be Monday", 400);
  if (new globalThis.Date(weekEndDate).getUTCDay() !== 0)
    throw new HttpException("Week end date must be Sunday", 400);
  if (
    new globalThis.Date(weekEndDate).getTime() <
    new globalThis.Date(weekStartDate).getTime()
  )
    throw new HttpException(
      "Week end date must not be before week start date",
      400,
    );
  const member = await MyGlobal.prisma.erp_hrm_time_members.findUniqueOrThrow({
    where: { id: props.member.id },
    select: { id: true },
  });
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_member_id: true,
      },
    });
  if (employee.erp_hrm_time_member_id !== props.member.id)
    throw new HttpException("Forbidden", 403);
  const existing = await MyGlobal.prisma.erp_hrm_time_timesheets.findFirst({
    where: {
      erp_hrm_time_employee_id: employee.id,
      week_start_date: new globalThis.Date(weekStartDate),
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing !== null)
    throw new HttpException("Timesheet already exists for this week", 409);
  const created = await MyGlobal.prisma.$transaction(async (tx) => {
    const draft = await tx.erp_hrm_time_timesheets.create({
      data: await ErpHrmTimeTimesheetCollector.collect({
        body: props.body,
        employee,
      }),
    });
    const timelogs = await tx.erp_hrm_time_timelogs.findMany({
      where: {
        erp_hrm_time_member_id: member.id,
        work_date: {
          gte: new globalThis.Date(weekStartDate),
          lte: new globalThis.Date(weekEndDate),
        },
        deleted_at: null,
      },
      select: { id: true },
    });
    if (timelogs.length > 0)
      await tx.erp_hrm_time_timesheet_timelogs.createMany({
        data: timelogs.map((timelog) => ({
          id: v4(),
          erp_hrm_time_timesheet_id: draft.id,
          erp_hrm_time_timelog_id: timelog.id,
          created_at: new globalThis.Date(),
          updated_at: new globalThis.Date(),
          deleted_at: null,
        })),
        skipDuplicates: true,
      });
    return await tx.erp_hrm_time_timesheets.findUniqueOrThrow({
      where: { id: draft.id },
      ...ErpHrmTimeTimesheetTransformer.select(),
    });
  });
  return await ErpHrmTimeTimesheetTransformer.transform(created);
}
