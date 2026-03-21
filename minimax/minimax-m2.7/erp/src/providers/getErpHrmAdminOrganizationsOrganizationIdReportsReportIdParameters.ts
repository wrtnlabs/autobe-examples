import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReport";
import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmReportParameterTransformer } from "../transformers/ErpHrmReportParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmAdminOrganizationsOrganizationIdReportsReportIdParameters(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
}): Promise<IErpHrmReportParameter> {
  // Validate report exists and belongs to the organization (data isolation)
  const report = await MyGlobal.prisma.erp_hrm_reports.findUnique({
    where: { id: props.reportId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  if (report === null) {
    throw new HttpException("Report not found", 404);
  }
  if (report.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException("Report not found", 404);
  }
  // Query report parameters using transformer
  const transformerSelect = ErpHrmReportParameterTransformer.select();
  const parameters = await MyGlobal.prisma.erp_hrm_report_parameters.findUnique(
    {
      where: { erp_hrm_report_id: props.reportId },
      ...transformerSelect,
    },
  );
  if (parameters === null) {
    throw new HttpException("Report parameters not found", 404);
  }
  return await ErpHrmReportParameterTransformer.transform(parameters);
}
