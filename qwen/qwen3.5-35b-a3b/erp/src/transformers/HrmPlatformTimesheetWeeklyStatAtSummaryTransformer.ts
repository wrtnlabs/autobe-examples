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
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformOrganizationAtSummaryTransformer } from "./HrmPlatformOrganizationAtSummaryTransformer";

export namespace HrmPlatformTimesheetWeeklyStatAtSummaryTransformer {
  export type Payload = Prisma.hrm_platform_timesheet_weekly_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        week_start: true,
        week_end: true,
        timesheet_count: true,
        total_hours: true,
        billable_hours: true,
        draft_timesheet_count: true,
        submitted_timesheet_count: true,
        approved_timesheet_count: true,
        rejected_timesheet_count: true,
        last_refreshed_at: true,
        organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
      },
    } satisfies Prisma.hrm_platform_timesheet_weekly_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheetWeeklyStat.ISummary> {
    return {
      id: input.id,
      organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      week_start: input.week_start.toISOString(),
      week_end: input.week_end.toISOString(),
      timesheet_count: input.timesheet_count,
      total_hours: input.total_hours,
      billable_hours: input.billable_hours,
      draft_timesheet_count: input.draft_timesheet_count,
      submitted_timesheet_count: input.submitted_timesheet_count,
      approved_timesheet_count: input.approved_timesheet_count,
      rejected_timesheet_count: input.rejected_timesheet_count,
      last_refreshed_at: input.last_refreshed_at.toISOString(),
    } satisfies IHrmPlatformTimesheetWeeklyStat.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTimesheetWeeklyStatAtSummaryTransformer {
//       export type Payload = Prisma.hrm_platform_timesheet_weekly_statsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             week_start: true,
//             week_end: true,
//             timesheet_count: true,
//             total_hours: true,
//             billable_hours: true,
//             draft_timesheet_count: true,
//             submitted_timesheet_count: true,
//             approved_timesheet_count: true,
//             rejected_timesheet_count: true,
//             last_refreshed_at: true,
//             organization: HrmPlatformOrganizationAtSummaryTransformer.select(),
//             employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.hrm_platform_timesheet_weekly_statsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTimesheetWeeklyStat.ISummary> {
//         return {
//   id: {string},
//   organization: await HrmPlatformOrganizationAtSummaryTransformer.transform(input.organization),
//   employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(input.employee),
//   week_start: {string},
//   week_end: {string},
//   timesheet_count: {integer},
//   total_hours: {number},
//   billable_hours: {number},
//   draft_timesheet_count: {integer},
//   submitted_timesheet_count: {integer},
//   approved_timesheet_count: {integer},
//   rejected_timesheet_count: {integer},
//   last_refreshed_at: {string},
//         };
//       }
//     }
//--------------------------------------------------------------