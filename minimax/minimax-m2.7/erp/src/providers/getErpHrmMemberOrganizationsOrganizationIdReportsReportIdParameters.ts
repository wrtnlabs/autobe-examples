import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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

export async function getErpHrmMemberOrganizationsOrganizationIdReportsReportIdParameters(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IErpHrmReportParameter.IInvert> {
  // Verify report exists and belongs to the organization (data isolation)
  const report = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  if (report.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException("Report not found", 404);
  }
  // Query parameters with transformer
  const parameters =
    await MyGlobal.prisma.erp_hrm_report_parameters.findUniqueOrThrow({
      where: { erp_hrm_report_id: props.reportId },
      ...ErpHrmReportParameterAtInvertTransformer.select(),
    });
  return await ErpHrmReportParameterAtInvertTransformer.transform(parameters);
}
