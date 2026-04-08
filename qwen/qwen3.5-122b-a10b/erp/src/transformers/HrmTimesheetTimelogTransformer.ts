import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmProject";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTask";
import { IHrmTimeReportItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeReportItem";
import { IHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimelog";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmEmployeeAtSummaryTransformer } from "./HrmEmployeeAtSummaryTransformer";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";

export namespace HrmTimesheetTimelogTransformer {
  export type Payload = Prisma.hrm_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        total_hours: true,
        submitted_at: true,
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmEmployeeAtSummaryTransformer.select(),
        reviewer: HrmMemberAtSummaryTransformer.select(),
        timesheetTimelogs: {
          select: {
            timelog: {
              select: {
                id: true,
                duration_minutes: true,
                billable: true,
              },
            },
          },
        } satisfies Prisma.hrm_timesheet_timelogsFindManyArgs,
      },
    } satisfies Prisma.hrm_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimesheetTimelog> {
    return {
      id: input.id,
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      status: input.status,
      total_hours: Number(input.total_hours),
      submitted_at: input.submitted_at?.toISOString() ?? null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      rejection_reason: input.rejection_reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
      reviewed_by: input.reviewer
        ? await HrmMemberAtSummaryTransformer.transform(input.reviewer)
        : null,
      timelogs: await ArrayUtil.asyncMap(
        input.timesheetTimelogs,
        async (junction) => {
          const timelog = junction.timelog;
          const totalHours = Number(timelog.duration_minutes) / 60;
          const billableHours = timelog.billable ? totalHours : 0;
          const nonBillableHours = timelog.billable ? 0 : totalHours;
          return {
            total_hours: totalHours,
            total_billable_hours: billableHours,
            total_non_billable_hours: nonBillableHours,
            total_entries: 1,
            items: [],
            cursor: null,
          } satisfies IHrmTimelog.ISummary;
        },
      ),
    } satisfies IHrmTimesheetTimelog;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimesheetTimelogTransformer {
//       export type Payload = Prisma.hrm_timesheetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             week_start_date: true,
//             week_end_date: true,
//             status: true,
//             total_hours: true,
//             submitted_at: true,
//             reviewed_at: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: HrmEmployeeAtSummaryTransformer.select(),
//             reviewer: HrmMemberAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.hrm_timesheetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimesheetTimelog> {
//         return {
//   id: {string},
//   week_start_date: {string},
//   week_end_date: {string},
//   status: {string},
//   total_hours: {number},
//   submitted_at: {string | null},
//   reviewed_at: {string | null},
//   rejection_reason: {string | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
//   reviewed_by: input.reviewer ? await HrmMemberAtSummaryTransformer.transform(input.reviewer) : null,
//   timelogs: {Array<IHrmTimelog.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------