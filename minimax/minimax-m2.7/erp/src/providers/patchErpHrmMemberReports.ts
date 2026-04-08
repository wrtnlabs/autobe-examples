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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmReportAtSummaryTransformer } from "../transformers/ErpHrmReportAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberReports(props: {
  member: MemberPayload;
  body: IErpHrmReport.IRequest;
}): Promise<IPageIErpHrmReport.ISummary> {
  // 1. Get session to retrieve organization context
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { erp_hrm_member_id: true },
    });
  // 2. Get employee's organization and role for authorization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: session.erp_hrm_member_id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
      erp_hrm_role_id: true,
    },
  });
  // 3. Verify report:view permission
  const hasPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "report:view",
      },
    });
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Pagination setup
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // 5. Build dynamic where clause with filters
  const whereInput: Prisma.erp_hrm_reportsWhereInput = {
    erp_hrm_organization_id: employee.erp_hrm_organization_id,
    ...(props.body.reportType !== undefined && {
      report_type: props.body.reportType,
    }),
    ...(props.body.generatorId !== undefined && {
      generated_by_erp_hrm_member_id: props.body.generatorId,
    }),
    ...(props.body.startDate !== undefined || props.body.endDate !== undefined
      ? {
          created_at: {
            ...(props.body.startDate !== undefined && {
              gte: props.body.startDate,
            }),
            ...(props.body.endDate !== undefined && {
              lte: props.body.endDate,
            }),
          },
        }
      : {}),
  };
  // 6. Execute queries sequentially
  const records = await MyGlobal.prisma.erp_hrm_reports.findMany({
    where: whereInput,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    ...ErpHrmReportAtSummaryTransformer.select(),
  });
  const total = await MyGlobal.prisma.erp_hrm_reports.count({
    where: whereInput,
  });
  // 7. Return paginated response
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
  };
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
// export async function patchErpHrmMemberReports(props: {
//   member: MemberPayload;
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