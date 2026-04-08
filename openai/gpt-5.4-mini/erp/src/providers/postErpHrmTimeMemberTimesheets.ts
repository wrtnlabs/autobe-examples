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
import { ErpHrmTimeTimesheetCollector } from "../collectors/ErpHrmTimeTimesheetCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTimeTimesheetTransformer } from "../transformers/ErpHrmTimeTimesheetTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmTimeMemberTimesheets(props: {
  member: MemberPayload;
  body: IErpHrmTimeTimesheet.ICreate;
}): Promise<IErpHrmTimeTimesheet> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        erp_hrm_time_member_id: props.member.id,
        status: "active",
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        status: true,
        deleted_at: true,
      },
    });
  const organization =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          erp_hrm_time_organization_id: employee.erp_hrm_time_organization_id,
          deleted_at: null,
        },
        select: {
          id: true,
        },
      },
    );
  void organization;
  const weekStartText: string = props.body.weekStartDate;
  const weekEndText: string = props.body.weekEndDate;
  const isoWeekday = (value: string): number => {
    const match = /^\d{4}-\d{2}-\d{2}T/.test(value)
      ? value.slice(0, 10)
      : value;
    const parsed = new globalThis.Date(value);
    if (Number.isNaN(parsed.getTime())) return 0;
    const day = parsed.getUTCDay();
    return day === 0 ? 7 : day;
  };
  if (isoWeekday(weekStartText) !== 1)
    throw new HttpException("Week start date must be Monday", 400);
  if (isoWeekday(weekEndText) !== 7)
    throw new HttpException("Week end date must be Sunday", 400);
  const weekStartDate = new globalThis.Date(weekStartText);
  const weekEndDate = new globalThis.Date(weekEndText);
  if (weekStartDate.getTime() > weekEndDate.getTime())
    throw new HttpException("Invalid timesheet week range", 400);
  const existing = await MyGlobal.prisma.erp_hrm_time_timesheets.findFirst({
    where: {
      erp_hrm_time_employee_id: employee.id,
      week_start_date: weekStartDate,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (existing !== null)
    throw new HttpException("Timesheet already exists for this week", 409);
  const created = await MyGlobal.prisma.erp_hrm_time_timesheets.create({
    data: await ErpHrmTimeTimesheetCollector.collect({
      body: props.body,
      employee: {
        id: employee.id,
      } satisfies IEntity,
    }),
    ...ErpHrmTimeTimesheetTransformer.select(),
  });
  return await ErpHrmTimeTimesheetTransformer.transform(created);
}
