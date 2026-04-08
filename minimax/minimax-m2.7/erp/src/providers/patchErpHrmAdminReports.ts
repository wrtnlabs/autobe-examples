import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmReportAtSummaryTransformer } from "../transformers/ErpHrmReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminReports(props: {
  admin: AdminPayload;
  body: IErpHrmReport.IRequest;
}): Promise<IPageIErpHrmReport.ISummary> {
  // Verify admin has organization context
  const orgContext = await MyGlobal.prisma.erp_hrm_organizations.findFirst({
    where: { owner_id: props.admin.id },
    select: { id: true },
  });
  if (!orgContext) {
    throw new HttpException("Organization context not found", 403);
  }
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const whereInput = {
    erp_hrm_organization_id: orgContext.id,
    ...(props.body.reportType && { report_type: props.body.reportType }),
    ...(props.body.startDate && {
      created_at: { gte: new Date(props.body.startDate) },
    }),
    ...(props.body.endDate && {
      created_at: { lte: new Date(props.body.endDate) },
    }),
    ...(props.body.generatorId && {
      generated_by_erp_hrm_member_id: props.body.generatorId,
    }),
  } satisfies Prisma.erp_hrm_reportsWhereInput;
  const records = await MyGlobal.prisma.erp_hrm_reports.findMany({
    ...ErpHrmReportAtSummaryTransformer.select(),
    where: whereInput,
    skip: skip,
    take: limit,
    orderBy: { created_at: "desc" },
  });
  const total = await MyGlobal.prisma.erp_hrm_reports.count({
    where: whereInput,
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: await ArrayUtil.asyncMap(
      records,
      ErpHrmReportAtSummaryTransformer.transform,
    ),
  } satisfies IPageIErpHrmReport.ISummary;
}


//--------------------------------------------------------------
// TEMPLATE CODE
//--------------------------------------------------------------
// Complete the code below, disregard the import part and return only the function part.
// 
// ```typescript
// import { ArrayUtil } from "@nestia/e2e";
// import { HttpException } from "@nestjs/common";
// import { Prisma } from "@prisma/sdk";
// import jwt from "jsonwebtoken";
// import typia, { tags } from "typia";
// import { v4 } from "uuid";
// import { MyGlobal } from "../MyGlobal";
// import { PasswordUtil } from "../utils/PasswordUtil";
// import { toISOStringSafe } from "../utils/toISOStringSafe"
// 
// import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
// import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
// import { IPageIErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIErpHrmReport";
// import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmAdminReports(props: {
//   admin: AdminPayload;
//   body: IErpHrmReport.IRequest;
// }): Promise<IPageIErpHrmReport.ISummary> {
//   const records = await MyGlobal.prisma.erp_hrm_reports.findMany({
//     ...ErpHrmReportAtSummaryTransformer.select(),
//     ...,
//   });
//   return {
//     pagination: {
//       current: ...,
//       limit: ...,
//       records: ...,
//       pages: ...,
//     },
//     data: await ArrayUtil.asyncMap(records, ErpHrmReportAtSummaryTransformer.transform),
//   };
// }
// ```
//--------------------------------------------------------------