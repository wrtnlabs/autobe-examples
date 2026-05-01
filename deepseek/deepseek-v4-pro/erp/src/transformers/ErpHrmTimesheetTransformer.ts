import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmTimelogAtSummaryTransformer } from "./ErpHrmTimelogAtSummaryTransformer";

export namespace ErpHrmTimesheetTransformer {
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
        reviewed_at: true,
        rejection_reason: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        reviewedByUser: ErpHrmMemberAtSummaryTransformer.select(),
        timelogs: ErpHrmTimelogAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmTimesheet> {
    return {
      id: input.id,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      status: input.status,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      reviewedByUser: input.reviewedByUser
        ? await ErpHrmMemberAtSummaryTransformer.transform(input.reviewedByUser)
        : null,
      rejection_reason: input.rejection_reason ?? null,
      timelogs: await ArrayUtil.asyncMap(
        input.timelogs,
        ErpHrmTimelogAtSummaryTransformer.transform,
      ),
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    };
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmTimesheetTransformer {
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
//             reviewedByUser: ErpHrmMemberAtSummaryTransformer.select(),
//             timelogs: ErpHrmTimelogAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTimesheet> {
//         return {
//   id: {string},
//   employee: await ErpHrmEmployeeAtSummaryTransformer.transform(input.employee),
//   week_start_date: {string},
//   week_end_date: {string},
//   status: {string},
//   submitted_at: {string | null},
//   reviewed_at: {string | null},
//   reviewedByUser: input.reviewedByUser ? await ErpHrmMemberAtSummaryTransformer.transform(input.reviewedByUser) : null,
//   rejection_reason: {string | null},
//   timelogs: await ArrayUtil.asyncMap(input.timelogs, ErpHrmTimelogAtSummaryTransformer.transform),
//   created_at: {string},
//   updated_at: {string},
//   deleted_at: {string | null},
//         };
//       }
//     }
//--------------------------------------------------------------