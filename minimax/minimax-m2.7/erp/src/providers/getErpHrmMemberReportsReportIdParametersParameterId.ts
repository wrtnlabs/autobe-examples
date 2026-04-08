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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmReportParameterAtInvertTransformer } from "../transformers/ErpHrmReportParameterAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberReportsReportIdParametersParameterId(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  parameterId: string & tags.Format<"uuid">;
}): Promise<IErpHrmReportParameter.IInvert> {
  const record =
    await MyGlobal.prisma.erp_hrm_report_parameters.findFirstOrThrow({
      ...ErpHrmReportParameterAtInvertTransformer.select(),
      where: {
        id: props.parameterId,
        erp_hrm_report_id: props.reportId,
      },
    });
  return await ErpHrmReportParameterAtInvertTransformer.transform(record);
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
// import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
// import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function getErpHrmMemberReportsReportIdParametersParameterId(props: {
//   member: MemberPayload;
//   reportId: string & tags.Format<"uuid">;
//   parameterId: string & tags.Format<"uuid">;
// }): Promise<IErpHrmReportParameter.IInvert> {
//   const record = await MyGlobal.prisma.erp_hrm_report_parameters.findFirstOrThrow({
//     ...ErpHrmReportParameterAtInvertTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmReportParameterAtInvertTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------