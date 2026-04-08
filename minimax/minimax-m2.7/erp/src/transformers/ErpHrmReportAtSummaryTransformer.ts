import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";

export namespace ErpHrmReportAtSummaryTransformer {
  export type Payload = Prisma.erp_hrm_reportsGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
      select: {
        id: true,
        report_type: true,
        name: true,
        created_at: true,
        updated_at: true,
        organization: ErpHrmOrganizationAtSummaryTransformer.select(),
        generatedByMember: ErpHrmMemberAtSummaryTransformer.select(),
        parameter: {
          select: { id: true },
        },
      },
    } satisfies Prisma.erp_hrm_reportsFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmReport.ISummary> {
    return {
      id: input.id,
      reportType: input.report_type as
        | "time_report"
        | "project_budget_report"
        | "weekly_summary_report",
      name: input.name ?? undefined,
      createdAt: toISOStringSafe(input.created_at),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      generatedByMember: await ErpHrmMemberAtSummaryTransformer.transform(
        input.generatedByMember,
      ),
    } satisfies IErpHrmReport.ISummary;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmReportAtSummaryTransformer {
//       export type Payload = Prisma.erp_hrm_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             id: true,
//             reportType: true,
//             name: true,
//             createdAt: true,
//             ...
//           },
//         } satisfies Prisma.erp_hrm_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmReport.ISummary> {
//         return {
//   id: {string},
//   reportType: {"time_report" | "project_budget_report" | "weekly_summary_report"},
//   name: {string},
//   createdAt: {string},
//   organization: {IErpHrmOrganization.ISummary},
//   generatedByMember: {IErpHrmMember.ISummary},
//         };
//       }
//     }
//--------------------------------------------------------------