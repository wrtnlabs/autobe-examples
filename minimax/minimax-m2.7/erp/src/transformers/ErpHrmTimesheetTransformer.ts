import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimelog";
import { IErpHrmTimesheet } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheet";
import { IErpHrmTimesheetTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimesheetTimelog";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmEmployeeAtSummaryTransformer } from "./ErpHrmEmployeeAtSummaryTransformer";
import { ErpHrmTimesheetTimelogTransformer } from "./ErpHrmTimesheetTimelogTransformer";

export namespace ErpHrmTimesheetTransformer {
  // 1. Payload type first
  export type Payload = Prisma.erp_hrm_timesheetsGetPayload<
    ReturnType<typeof select>
  >;
  // 2. select() function second
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
        employee: ErpHrmEmployeeAtSummaryTransformer.select(),
        reviewerEmployee: ErpHrmEmployeeAtSummaryTransformer.select(),
        timesheetTimelogs: ErpHrmTimesheetTimelogTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
  }
  // 3. transform() function last
  export async function transform(input: Payload): Promise<IErpHrmTimesheet> {
    return {
      id: input.id,
      weekStartDate: input.week_start_date.toISOString(),
      weekEndDate: input.week_end_date.toISOString(),
      status: input.status,
      totalHours: Number(input.total_hours),
      submittedAt: input.submitted_at?.toISOString() ?? null,
      reviewedAt: input.reviewed_at?.toISOString() ?? null,
      rejectionReason: input.rejection_reason,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
      employee: await ErpHrmEmployeeAtSummaryTransformer.transform(
        input.employee,
      ),
      reviewerEmployee: input.reviewerEmployee
        ? await ErpHrmEmployeeAtSummaryTransformer.transform(
            input.reviewerEmployee,
          )
        : null,
      timesheetTimelogs: await ArrayUtil.asyncMap(
        input.timesheetTimelogs,
        ErpHrmTimesheetTimelogTransformer.transform,
      ),
    } satisfies IErpHrmTimesheet;
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
//             total_hours: true,
//             submitted_at: true,
//             reviewed_at: true,
//             rejection_reason: true,
//             created_at: true,
//             updated_at: true,
//             deleted_at: true,
//             erp_hrm_employee_id: true,
//             erp_hrm_reviewer_employee_id: true,
//             timesheetTimelogs: ErpHrmTimesheetTimelogTransformer.select(),
//             ...
//           },
//         } satisfies Prisma.erp_hrm_timesheetsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmTimesheet> {
//         return {
//   id: {string},
//   weekStartDate: {string},
//   weekEndDate: {string},
//   status: {string},
//   totalHours: {number},
//   submittedAt: {string | null},
//   reviewedAt: {string | null},
//   rejectionReason: {string | null},
//   createdAt: {string},
//   updatedAt: {string},
//   deletedAt: {string | null},
//   employee: {IErpHrmEmployee.ISummary},
//   reviewerEmployee: {IErpHrmEmployee.ISummary | null},
//   timesheetTimelogs: await ArrayUtil.asyncMap(input.timesheetTimelogs, ErpHrmTimesheetTimelogTransformer.transform),
//         };
//       }
//     }
//--------------------------------------------------------------