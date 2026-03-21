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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmReportTransformer } from "../transformers/ErpHrmReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationsOrganizationIdReportsGenerate(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmReport.ICreate;
}): Promise<IErpHrmReport> {
  // Validate organization exists
  const organization = await MyGlobal.prisma.erp_hrm_organizations.findUnique({
    where: { id: props.organizationId },
    select: { id: true },
  });
  if (organization === null) {
    throw new HttpException("Organization not found", 404);
  }
  // Validate member belongs to organization and has report:view permission
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  if (employee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Check report:view permission by querying role_permissions table
  const hasReportViewPermission =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        erp_hrm_role_id: employee.erp_hrm_role_id,
        permission: "report:view",
      },
      select: { permission: true },
    });
  if (hasReportViewPermission === null) {
    throw new HttpException("You do not have permission to view reports", 403);
  }
  // Create report using collector
  const report = await MyGlobal.prisma.erp_hrm_reports.create({
    data: await ErpHrmReportCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: props.organizationId },
      erpHrmMembers: { id: props.member.id },
    }),
    ...ErpHrmReportTransformer.select(),
  });
  // Return transformed response
  return await ErpHrmReportTransformer.transform(report);
}
