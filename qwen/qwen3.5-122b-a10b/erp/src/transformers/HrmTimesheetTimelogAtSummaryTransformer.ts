import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmDepartment";
import { IHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmEmployee";
import { IHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmMember";
import { IHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmOrganization";
import { IHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmRole";
import { IHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { HrmEmployeeAtSummaryTransformer } from "./HrmEmployeeAtSummaryTransformer";
import { HrmMemberAtSummaryTransformer } from "./HrmMemberAtSummaryTransformer";

export namespace HrmTimesheetTimelogAtSummaryTransformer {
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
      },
    } satisfies Prisma.hrm_timesheetsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IHrmTimesheetTimelog.ISummary> {
    return {
      id: input.id,
      employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
      reviewer: input.reviewer
        ? await HrmMemberAtSummaryTransformer.transform(input.reviewer)
        : null,
      week_start_date: input.week_start_date.toISOString(),
      week_end_date: input.week_end_date.toISOString(),
      status: input.status,
      total_hours: input.total_hours,
      submitted_at: input.submitted_at?.toISOString() ?? null,
      reviewed_at: input.reviewed_at?.toISOString() ?? null,
      rejection_reason: input.rejection_reason ?? null,
      created_at: input.created_at.toISOString(),
      updated_at: input.updated_at.toISOString(),
      deleted_at: input.deleted_at?.toISOString() ?? null,
    } satisfies IHrmTimesheetTimelog.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace HrmTimesheetTimelogAtSummaryTransformer {
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
//           },
//         } satisfies Prisma.hrm_timesheetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IHrmTimesheetTimelog.ISummary> {
//         return {
//   id: {string},
//   employee: await HrmEmployeeAtSummaryTransformer.transform(input.employee),
//   reviewer: input.reviewer ? await HrmMemberAtSummaryTransformer.transform(input.reviewer) : null,
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
//         };
//       }
//     }
//--------------------------------------------------------------