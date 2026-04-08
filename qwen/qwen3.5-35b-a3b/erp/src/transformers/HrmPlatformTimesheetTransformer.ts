import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTask";
import { IHrmPlatformTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimelog";
import { IHrmPlatformTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmPlatformEmployeeAtSummaryTransformer } from "./HrmPlatformEmployeeAtSummaryTransformer";
import { HrmPlatformTimelogAtSummaryTransformer } from "./HrmPlatformTimelogAtSummaryTransformer";

export namespace HrmPlatformTimesheetTransformer {
  export type Payload = Prisma.hrm_platform_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_date: true,
        end_date: true,
        status: true,
        submitted_at: true,
        approved_at: true,
        rejected_at: true,
        cancelled_at: true,
        notes: true,
        total_hours: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
        timelogs: {
          select: {
            timelog: HrmPlatformTimelogAtSummaryTransformer.select(),
          },
        } satisfies Prisma.hrm_platform_timesheet_timelogsFindManyArgs,
        actions: true,
      },
    } satisfies Prisma.hrm_platform_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmPlatformTimesheet> {
    return {
      id: input.id,
      hrm_platform_employee_id: input.employee.id,
      start_date: input.start_date.toISOString(),
      end_date: input.end_date.toISOString(),
      status: input.status,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      approved_at: input.approved_at?.toISOString() ?? null,
      rejected_at: input.rejected_at?.toISOString() ?? null,
      cancelled_at: input.cancelled_at?.toISOString() ?? null,
      notes: input.notes ?? null,
      total_hours: input.total_hours ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      timelogs: await ArrayUtil.asyncMap(input.timelogs, (t) =>
        HrmPlatformTimelogAtSummaryTransformer.transform(t.timelog),
      ),
    } satisfies IHrmPlatformTimesheet;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmPlatformTimesheetTransformer {
//       export type Payload = Prisma.hrm_platform_timesheetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             start_date: true,
//             end_date: true,
//             status: true,
//             submitted_at: true,
//             approved_at: true,
//             rejected_at: true,
//             cancelled_at: true,
//             notes: true,
//             total_hours: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: HrmPlatformEmployeeAtSummaryTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.hrm_platform_timesheetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmPlatformTimesheet> {
//         return {
//   id: {string},
//   hrm_platform_employee_id: {string},
//   start_date: {string},
//   end_date: {string},
//   status: {string},
//   submitted_at: {string | null},
//   approved_at: {string | null},
//   rejected_at: {string | null},
//   cancelled_at: {string | null},
//   notes: {string | null},
//   total_hours: {number | null},
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//   employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(input.employee),
//   timelogs: {Array<IHrmPlatformTimelog.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------