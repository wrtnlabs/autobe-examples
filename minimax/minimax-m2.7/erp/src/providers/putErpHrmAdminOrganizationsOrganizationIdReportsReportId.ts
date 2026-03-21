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
import { ErpHrmReportTransformer } from "../transformers/ErpHrmReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminOrganizationsOrganizationIdReportsReportId(props: {
  admin: AdminPayload;
  organizationId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IErpHrmReport.IUpdate;
}): Promise<IErpHrmReport> {
  const existingReport =
    await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        parameter: {
          select: { id: true },
        },
      },
    });
  if (existingReport.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException(
      "Report not found in the specified organization",
      404,
    );
  }
  await MyGlobal.prisma.erp_hrm_reports.update({
    where: { id: props.reportId },
    data: {
      ...(props.body.name !== undefined && { name: props.body.name }),
      updated_at: new Date(),
    },
  });
  if (props.body.parameter !== undefined) {
    const paramData: Prisma.erp_hrm_report_parametersUpdateInput = {
      updated_at: new Date(),
    };
    if (props.body.parameter.start_date !== undefined) {
      paramData.start_date = new Date(props.body.parameter.start_date);
    }
    if (props.body.parameter.end_date !== undefined) {
      paramData.end_date = new Date(props.body.parameter.end_date);
    }
    if (props.body.parameter.group_by !== undefined) {
      paramData.group_by = props.body.parameter.group_by;
    }
    if (props.body.parameter.billable !== undefined) {
      paramData.billable = props.body.parameter.billable;
    }
    if (props.body.parameter.employee_id !== undefined) {
      paramData.employee_id = props.body.parameter.employee_id;
    }
    if (props.body.parameter.project_id !== undefined) {
      paramData.project_id = props.body.parameter.project_id;
    }
    if (props.body.parameter.task_id !== undefined) {
      paramData.task_id = props.body.parameter.task_id;
    }
    if (existingReport.parameter) {
      await MyGlobal.prisma.erp_hrm_report_parameters.update({
        where: { id: existingReport.parameter.id },
        data: paramData,
      });
    }
  }
  const updatedReport = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow(
    {
      where: { id: props.reportId },
      ...ErpHrmReportTransformer.select(),
    },
  );
  return await ErpHrmReportTransformer.transform(updatedReport);
}
