import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformEmployeeAtSummaryTransformer } from "../transformers/HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationAtSummaryTransformer";
import { HrmPlatformTimesheetWeeklyStatAtSummaryTransformer } from "../transformers/HrmPlatformTimesheetWeeklyStatAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimetrackingOrganizationWeeklyHours(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformTimesheetWeeklyStat.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { organization_id: true, member: { select: { id: true } } },
    });
  if (session.organization_id === null) {
    throw new HttpException("Organization not found", 404);
  }
  const organizationId: string & tags.Format<"uuid"> = session.organization_id;
  const now = new Date();
  const currentDay = now.getDay();
  const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() + diffToMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  const records =
    await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findMany({
      where: {
        organization: { id: organizationId },
        week_start: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
      ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
    });
  const firstRecord = records.length > 0 ? records[0] : null;
  const totalHours = records.reduce(
    (sum, record) => sum + (record.total_hours ?? 0),
    0,
  );
  const billableHours = records.reduce(
    (sum, record) => sum + (record.billable_hours ?? 0),
    0,
  );
  const timesheetCount = records.reduce(
    (sum, record) => sum + (record.timesheet_count ?? 0),
    0,
  );
  const draftTimesheetCount = records.reduce(
    (sum, record) => sum + (record.draft_timesheet_count ?? 0),
    0,
  );
  const submittedTimesheetCount = records.reduce(
    (sum, record) => sum + (record.submitted_timesheet_count ?? 0),
    0,
  );
  const approvedTimesheetCount = records.reduce(
    (sum, record) => sum + (record.approved_timesheet_count ?? 0),
    0,
  );
  const rejectedTimesheetCount = records.reduce(
    (sum, record) => sum + (record.rejected_timesheet_count ?? 0),
    0,
  );
  const lastRefreshedAt = firstRecord
    ? firstRecord.last_refreshed_at.toISOString()
    : weekStart.toISOString();
  const organization =
    await MyGlobal.prisma.hrm_platform_organizations.findUniqueOrThrow({
      where: { id: organizationId },
      ...HrmPlatformOrganizationAtSummaryTransformer.select(),
    });
  const employee = firstRecord
    ? await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
        where: { id: firstRecord.employee.id },
        ...HrmPlatformEmployeeAtSummaryTransformer.select(),
      })
    : await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
        where: { organization: { id: organizationId } },
        ...HrmPlatformEmployeeAtSummaryTransformer.select(),
      });
  return {
    id: firstRecord?.id ?? v4(),
    organization:
      await HrmPlatformOrganizationAtSummaryTransformer.transform(organization),
    employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(employee),
    week_start: weekStart.toISOString(),
    week_end: weekEnd.toISOString(),
    timesheet_count: timesheetCount,
    total_hours: totalHours,
    billable_hours: billableHours,
    draft_timesheet_count: draftTimesheetCount,
    submitted_timesheet_count: submittedTimesheetCount,
    approved_timesheet_count: approvedTimesheetCount,
    rejected_timesheet_count: rejectedTimesheetCount,
    last_refreshed_at: lastRefreshedAt,
  } satisfies IHrmPlatformTimesheetWeeklyStat.ISummary;
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
// import { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
// import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
// import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
// import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
// import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
// import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getHrmPlatformMemberTimetrackingOrganizationWeeklyHours(props: {
//   member: MemberPayload;
// }): Promise<IHrmPlatformTimesheetWeeklyStat.ISummary> {
//   const record = await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findFirstOrThrow({
//     ...HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.select(),
//     where: { ... },
//   });
//   return await HrmPlatformTimesheetWeeklyStatAtSummaryTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------