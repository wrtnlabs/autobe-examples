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

export async function postErpHrmMemberOrganizationsOrganizationIdReports(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmReport.ICreate;
}): Promise<IErpHrmReport> {
  // 1. Validate organization exists
  await MyGlobal.prisma.erp_hrm_organizations.findUniqueOrThrow({
    where: { id: props.organizationId },
    select: { id: true },
  });
  // 2. Validate date range: start_date must be before or equal to end_date
  const startDate = new Date(props.body.parameter.start_date);
  const endDate = new Date(props.body.parameter.end_date);
  if (startDate > endDate) {
    throw new HttpException(
      "Start date must be before or equal to end date",
      400,
    );
  }
  // 3. Validate employee_id belongs to the same organization
  if (props.body.parameter.employee_id != null) {
    const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        id: props.body.parameter.employee_id,
        erp_hrm_organization_id: props.organizationId,
        deleted_at: null,
      },
      select: { id: true },
    });
    if (!employee) {
      throw new HttpException(
        "Employee does not belong to this organization",
        400,
      );
    }
  }
  // 4. Validate project_id belongs to the same organization
  if (props.body.parameter.project_id != null) {
    const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
      where: {
        id: props.body.parameter.project_id,
        erp_hrm_organization_id: props.organizationId,
      },
      select: { id: true },
    });
    if (!project) {
      throw new HttpException(
        "Project does not belong to this organization",
        400,
      );
    }
  }
  // 5. Validate task_id belongs to a project in the same organization
  if (props.body.parameter.task_id != null) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.parameter.task_id,
        project: {
          erp_hrm_organization_id: props.organizationId,
        },
      },
      select: { id: true },
    });
    if (!task) {
      throw new HttpException(
        "Task does not belong to a project in this organization",
        400,
      );
    }
  }
  // 6. Create the report with collector
  const created = await MyGlobal.prisma.erp_hrm_reports.create({
    data: await ErpHrmReportCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: props.organizationId },
      erpHrmMembers: { id: props.member.id },
    }),
    ...ErpHrmReportTransformer.select(),
  });
  // 7. Return the transformed response
  return ErpHrmReportTransformer.transform(created);
}
