import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformTimesheetWeeklyStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheetWeeklyStat";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export namespace HrmPlatformTimesheetWeeklyStatTransformer {
  export type Payload = Prisma.hrm_platform_timesheet_weekly_statsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        organization_id: true,
        employee_id: true,
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
        organization: true,
        employee: true,
      },
    } satisfies Prisma.hrm_platform_timesheet_weekly_statsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheetWeeklyStat> {
    return {
      id: input.id,
      organization_id: input.organization_id,
      employee_id: input.employee_id,
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
    } satisfies IHrmPlatformTimesheetWeeklyStat;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTimesheetWeeklyStatTransformer {
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
//             organization_id: true,
//             employee_id: true,
//           },
//         } satisfies Prisma.hrm_platform_timesheet_weekly_statsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTimesheetWeeklyStat> {
//         return {
//   id: {string},
//   organization_id: {string},
//   employee_id: {string},
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