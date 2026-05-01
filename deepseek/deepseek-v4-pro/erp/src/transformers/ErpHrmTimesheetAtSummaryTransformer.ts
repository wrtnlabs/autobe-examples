import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";

export namespace ErpHrmTimesheetAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        week_start_date: true,
        week_end_date: true,
        status: true,
        submitted_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        timelogs: {
          select: {
            duration_minutes: true,
          },
        } satisfies Prisma.erp_hrm_timelogsFindManyArgs,
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimesheet.ISummary> {
    return {
      id: input.id,
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      status: input.status,
      total_hours:
        input.timelogs.reduce((sum, t) => sum + t.duration_minutes, 0) / 60,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
    } satisfies IErpHrmTimesheet.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTimesheetAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_timesheetsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             week_start_date: true,
//             week_end_date: true,
//             status: true,
//             submitted_at: true,
//             reviewed_at: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             employee: ErpHrmEmployeeAtSummaryTransformer.select(),
//             reviewed_by_user_id: true,
//           },
//         } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTimesheet.ISummary> {
//         return {
//   id: {string},
//   week_start_date: {string},
//   week_end_date: {string},
//   status: {string},
//   total_hours: {number},
//   submitted_at: {string | null},
//   employee: await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee),
//         };
//       }
//     }
//--------------------------------------------------------------