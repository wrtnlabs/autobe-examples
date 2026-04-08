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
import { HrmPlatformOrganizationAtSummaryTransformer } from "../transformers/HrmPlatformOrganizationAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmPlatformMemberTimetrackingOrganizationWeeklyHours(props: {
  member: MemberPayload;
}): Promise<IHrmPlatformTimesheetWeeklyStat.ISummary> {
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
        expired_at: { gt: new Date() },
        hrm_platform_member_id: props.member.id,
        member: {
          id: props.member.id,
          is_active: true,
          deleted_at: null,
        },
      },
      include: {
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
      },
    });
  if (!session.organization_id) {
    throw new HttpException("Organization ID is required", 400);
  }
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - daysSinceMonday);
  weekStart.setHours(0, 0, 0, 0);
  const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  weekEnd.setHours(23, 59, 59, 999);
  const stats =
    await MyGlobal.prisma.hrm_platform_timesheet_weekly_stats.findMany({
      where: {
        organization_id: session.organization_id,
        week_start: {
          gte: weekStart,
          lte: weekEnd,
        },
      },
    });
  const totalHours = stats.reduce(
    (sum, stat) => sum + (stat.total_hours ?? 0),
    0,
  );
  const billableHours = stats.reduce(
    (sum, stat) => sum + (stat.billable_hours ?? 0),
    0,
  );
  const timesheetCount = stats.reduce(
    (sum, stat) => sum + (stat.timesheet_count ?? 0),
    0,
  );
  const draftTimesheetCount = stats.reduce(
    (sum, stat) => sum + (stat.draft_timesheet_count ?? 0),
    0,
  );
  const submittedTimesheetCount = stats.reduce(
    (sum, stat) => sum + (stat.submitted_timesheet_count ?? 0),
    0,
  );
  const approvedTimesheetCount = stats.reduce(
    (sum, stat) => sum + (stat.approved_timesheet_count ?? 0),
    0,
  );
  const rejectedTimesheetCount = stats.reduce(
    (sum, stat) => sum + (stat.rejected_timesheet_count ?? 0),
    0,
  );
  const organization = session.organization!;
  const memberData: IHrmPlatformMember.ISummary = {
    id: v4(),
    email: "organization@example.com",
    display_name: "Organization Aggregate",
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const owner: IHrmPlatformMember.ISummary = {
    id: organization.owner.id,
    email: organization.owner.email,
    display_name: organization.owner.display_name ?? undefined,
    avatar_uri: organization.owner.avatar_uri ?? undefined,
    phone_number: organization.owner.phone_number ?? undefined,
    is_active: organization.owner.is_active,
    last_login_at: organization.owner.last_login_at?.toISOString() ?? null,
    created_at: organization.owner.created_at.toISOString(),
    updated_at: organization.owner.updated_at.toISOString(),
    deleted_at: organization.owner.deleted_at?.toISOString() ?? null,
  };
  const roleData: IHrmPlatformRole.ISummary = {
    id: v4(),
    name: "Organization",
    role_kind: "custom",
    organization: {
      id: organization.id,
      name: organization.name,
      description: organization.description ?? undefined,
      currency: organization.currency,
      timezone: organization.timezone,
      fiscal_start_month: organization.fiscal_start_month ?? undefined,
      created_at: organization.created_at.toISOString(),
      updated_at: organization.updated_at.toISOString(),
      deleted_at: organization.deleted_at?.toISOString() ?? null,
      owner,
    },
    permissions_count: 0,
  };
  const employeeData: IHrmPlatformEmployee.ISummary = {
    id: v4(),
    employee_code: "ORGANIZATION",
    display_name: "Organization Aggregate",
    email: "organization@example.com",
    phone_number: undefined,
    job_title: undefined,
    job_level: "organization",
    employment_type: "organization",
    status: "active",
    start_date: organization.created_at.toISOString(),
    end_date: undefined,
    is_pending: false,
    member: memberData,
    role: roleData,
    department: null,
    organization: {
      id: organization.id,
      name: organization.name,
      description: organization.description ?? undefined,
      currency: organization.currency,
      timezone: organization.timezone,
      fiscal_start_month: organization.fiscal_start_month ?? undefined,
      created_at: organization.created_at.toISOString(),
      updated_at: organization.updated_at.toISOString(),
      deleted_at: organization.deleted_at?.toISOString() ?? null,
      owner,
    },
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    deleted_at: null,
  };
  return {
    id: v4(),
    organization: {
      id: organization.id,
      name: organization.name,
      description: organization.description ?? undefined,
      currency: organization.currency,
      timezone: organization.timezone,
      fiscal_start_month: organization.fiscal_start_month ?? undefined,
      created_at: organization.created_at.toISOString(),
      updated_at: organization.updated_at.toISOString(),
      deleted_at: organization.deleted_at?.toISOString() ?? null,
      owner,
    },
    employee: employeeData,
    week_start: weekStart.toISOString(),
    week_end: weekEnd.toISOString(),
    timesheet_count: timesheetCount,
    total_hours: Math.round(totalHours * 100) / 100,
    billable_hours: Math.round(billableHours * 100) / 100,
    draft_timesheet_count: draftTimesheetCount,
    submitted_timesheet_count: submittedTimesheetCount,
    approved_timesheet_count: approvedTimesheetCount,
    rejected_timesheet_count: rejectedTimesheetCount,
    last_refreshed_at: new Date().toISOString(),
  };
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