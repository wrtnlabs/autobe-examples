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
import { ErpHrmMemberAtSummaryTransformer } from "./ErpHrmMemberAtSummaryTransformer";
import { ErpHrmOrganizationAtSummaryTransformer } from "./ErpHrmOrganizationAtSummaryTransformer";
import { ErpHrmReportParameterTransformer } from "./ErpHrmReportParameterTransformer";

export namespace ErpHrmReportTransformer {
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
        parameter: ErpHrmReportParameterTransformer.select(),
      },
    } satisfies Prisma.erp_hrm_reportsFindManyArgs;
  }
  export async function transform(input: Payload): Promise<IErpHrmReport> {
    return {
      id: input.id,
      reportType: input.report_type,
      name: input.name ?? undefined,
      createdAt: toISOStringSafe(input.created_at),
      updatedAt: toISOStringSafe(input.updated_at),
      organization: await ErpHrmOrganizationAtSummaryTransformer.transform(
        input.organization,
      ),
      generatedByMember: await ErpHrmMemberAtSummaryTransformer.transform(
        input.generatedByMember,
      ),
      parameter: input.parameter
        ? typia.assert<IErpHrmReportParameter>(
            await ErpHrmReportParameterTransformer.transform(input.parameter),
          )
        : (() => {
            throw new Error("Report parameter is required but not provided");
          })(),
    } satisfies IErpHrmReport;
  }
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
//     export namespace ErpHrmReportTransformer {
//       export type Payload = Prisma.erp_hrm_reportsGetPayload<ReturnType<typeof select>>;
// 
//       export function select() {
//         // implicit return type for better type inference
//         return {
//           select: {
//             createdAt: true,
//             id: true,
//             name: true,
//             reportType: true,
//             updatedAt: true,
//             ...
//           },
//         } satisfies Prisma.erp_hrm_reportsFindManyArgs;
//       }
// 
//       export async function transform(input: Payload): Promise<IErpHrmReport> {
//         return {
//   createdAt: {string},
//   generatedByMember: {IErpHrmMember.ISummary},
//   id: {string},
//   name: {string},
//   organization: {IErpHrmOrganization.ISummary},
//   parameter: {IErpHrmReportParameter},
//   reportType: {string},
//   updatedAt: {string},
//         };
//       }
//     }
//--------------------------------------------------------------