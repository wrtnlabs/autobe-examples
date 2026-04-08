import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmReportAtSummaryTransformer } from "./ErpHrmReportAtSummaryTransformer";

export namespace ErpHrmReportParameterAtInvertTransformer {
  export type Payload = Prisma.erp_hrm_report_parametersGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        start_date: true,
        end_date: true,
        employee_id: true,
        project_id: true,
        task_id: true,
        billable: true,
        group_by: true,
        created_at: true,
        updated_at: true,
        report: ErpHrmReportAtSummaryTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_report_parametersFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmReportParameter.IInvert> {
    return {
      id: input.id,
      startDate: input.start_date.toISOString(),
      endDate: input.end_date.toISOString(),
      employeeId: input.employee_id,
      projectId: input.project_id,
      taskId: input.task_id,
      billable: input.billable,
      groupBy: input.group_by,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      report: await ErpHrmReportAtSummaryTransformer.transform(input.report),
    } satisfies IErpHrmReportParameter.IInvert;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmReportParameterAtInvertTransformer {
//       export type Payload = Prisma.erp_hrm_report_parametersGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             start_date: true,
//             end_date: true,
//             employee_id: true,
//             project_id: true,
//             task_id: true,
//             billable: true,
//             group_by: true,
//             created_at: true,
//             updated_at: true,
//             report: ErpHrmReportAtSummaryTransformer.select(),
//           },
//         } satisfies Prisma.erp_hrm_report_parametersFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmReportParameter.IInvert> {
//         return {
//   id: {string},
//   startDate: {string},
//   endDate: {string},
//   employeeId: {string | null},
//   projectId: {string | null},
//   taskId: {string | null},
//   billable: {boolean | null},
//   groupBy: {string},
//   createdAt: {string},
//   updatedAt: {string},
//   report: await ErpHrmReportAtSummaryTransformer.transform(input.report),
//         };
//       }
//     }
//--------------------------------------------------------------