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
import { ErpHrmReportCollector } from "../collectors/ErpHrmReportCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmReportTransformer } from "../transformers/ErpHrmReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminOrganizationsOrganizationIdReports(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmReport.ICreate;
}): Promise<IErpHrmReport> {
  // Validate organization exists
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
  });
  // Create report with nested parameters
  const report = await MyGlobal.prisma.erp_hrm_reports.create({
    data: await ErpHrmReportCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: props.organizationId },
      erpHrmMembers: { id: props.admin.id },
    }),
    ...ErpHrmReportTransformer.select(),
  });
  return await ErpHrmReportTransformer.transform(report);
}
