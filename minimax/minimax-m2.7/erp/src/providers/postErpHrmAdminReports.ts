import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmReportCollector } from "../collectors/ErpHrmReportCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmReportTransformer } from "../transformers/ErpHrmReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminReports(props: {
  admin: AdminPayload;
  body: IErpHrmReport.ICreate;
}): Promise<IErpHrmReport> {
  // Verify admin exists
  const admin = await MyGlobal.prisma.erp_hrm_admins.findUniqueOrThrow({
    where: { id: props.admin.id },
    select: { id: true, email: true },
  });
  // Find member associated with this admin by email
  const member = await MyGlobal.prisma.erp_hrm_members.findFirstOrThrow({
    where: { email: admin.email },
    select: { id: true },
  });
  // Find organization via employee record
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: { erp_hrm_member_id: member.id },
    select: { erp_hrm_organization_id: true },
  });
  if (!employee) {
    throw new HttpException(
      "Admin has no organization context for report generation",
      403,
    );
  }
  const record = await MyGlobal.prisma.erp_hrm_reports.create({
    data: await ErpHrmReportCollector.collect({
      body: props.body,
      erpHrmOrganizations: {
        id: employee.erp_hrm_organization_id,
      },
      erpHrmMembers: {
        id: member.id,
      },
    }),
    ...ErpHrmReportTransformer.select(),
  });
  return await ErpHrmReportTransformer.transform(record);
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
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function postErpHrmAdminReports(props: {
//   admin: AdminPayload;
//   body: IErpHrmReport.ICreate;
// }): Promise<IErpHrmReport> {
//   const record = await MyGlobal.prisma.erp_hrm_reports.create({
//     data: await ErpHrmReportCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmReportTransformer.select(),
//   });
//   return await ErpHrmReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------