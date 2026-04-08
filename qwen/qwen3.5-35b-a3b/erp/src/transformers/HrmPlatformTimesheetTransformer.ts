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
        },
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
      start_date: toISOStringSafe(input.start_date),
      end_date: toISOStringSafe(input.end_date),
      status: input.status,
      submitted_at: input.submitted_at
        ? toISOStringSafe(input.submitted_at)
        : null,
      approved_at: input.approved_at
        ? toISOStringSafe(input.approved_at)
        : null,
      rejected_at: input.rejected_at
        ? toISOStringSafe(input.rejected_at)
        : null,
      cancelled_at: input.cancelled_at
        ? toISOStringSafe(input.cancelled_at)
        : null,
      notes: input.notes ?? null,
      total_hours: input.total_hours ?? null,
      created_at: toISOStringSafe(input.created_at),
      updated_at: toISOStringSafe(input.updated_at),
      deleted_at: input.deleted_at ? toISOStringSafe(input.deleted_at) : null,
      employee: await HrmPlatformEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      timelogs: await ArrayUtil.asyncMap(input.timelogs, (tl) =>
        HrmPlatformTimelogAtSummaryTransformer.transform(tl.timelog),
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
//             hrm_platform_employee_id: true,
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
//   employee: {IHrmPlatformEmployee.ISummary},
//   timelogs: {Array<IHrmPlatformTimelog.ISummary>},
//         };
//       }
//     }
//--------------------------------------------------------------