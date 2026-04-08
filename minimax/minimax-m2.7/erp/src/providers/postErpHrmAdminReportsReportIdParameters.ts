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
import { ErpHrmReportParameterCollector } from "../collectors/ErpHrmReportParameterCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmReportParameterTransformer } from "../transformers/ErpHrmReportParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmAdminReportsReportIdParameters(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IErpHrmReportParameter.ICreate;
}): Promise<IErpHrmReportParameter> {
  // Step 1: Fetch the report and verify it exists
  const report = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  // Step 2: Verify no existing parameters (1:1 relationship)
  const existingParams =
    await MyGlobal.prisma.erp_hrm_report_parameters.findUnique({
      where: { erp_hrm_report_id: props.reportId },
      select: { id: true },
    });
  if (existingParams) {
    throw new HttpException("Report already has parameters defined", 409);
  }
  // Step 3: Validate date range
  const startDate = new Date(props.body.startDate);
  const endDate = new Date(props.body.endDate);
  if (startDate > endDate) {
    throw new HttpException("Start date must not be after end date", 400);
  }
  // Step 4: Validate group_by is one of allowed values
  const validGroupByOptions = ["employee", "project", "task"] as const;
  if (!validGroupByOptions.includes(props.body.groupBy)) {
    throw new HttpException(
      `Invalid groupBy value. Must be one of: ${validGroupByOptions.join(", ")}`,
      400,
    );
  }
  // Step 5: Validate optional employee reference if provided
  if (props.body.employeeId !== undefined) {
    const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        id: props.body.employeeId,
        erp_hrm_organization_id: report.erp_hrm_organization_id,
      },
      select: { id: true },
    });
    if (!employee) {
      throw new HttpException("Employee not found in organization", 404);
    }
  }
  // Step 6: Validate optional project reference if provided
  if (props.body.projectId !== undefined) {
    const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
      where: {
        id: props.body.projectId,
        erp_hrm_organization_id: report.erp_hrm_organization_id,
      },
      select: { id: true },
    });
    if (!project) {
      throw new HttpException("Project not found in organization", 404);
    }
  }
  // Step 7: Validate optional task reference if provided
  if (props.body.taskId !== undefined) {
    const task = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.taskId,
        erp_hrm_project_id: props.body.projectId,
      },
      select: { id: true },
    });
    if (!task) {
      throw new HttpException("Task not found in organization", 404);
    }
  }
  // Step 8: Create report parameters using Collector
  const reportEntity: IEntity = { id: report.id };
  const created = await MyGlobal.prisma.erp_hrm_report_parameters.create({
    data: await ErpHrmReportParameterCollector.collect({
      body: props.body,
      erpHrmReports: reportEntity,
    }),
    ...ErpHrmReportParameterTransformer.select(),
  });
  // Step 9: Return transformed response
  return await ErpHrmReportParameterTransformer.transform(created);
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
// export async function postErpHrmAdminReportsReportIdParameters(props: {
//   admin: AdminPayload;
//   reportId: string & tags.Format<"uuid">;
//   body: IErpHrmReportParameter.ICreate;
// }): Promise<IErpHrmReportParameter> {
//   const record = await MyGlobal.prisma.erp_hrm_report_parameters.create({
//     data: await ErpHrmReportParameterCollector.collect({
//       body: props.body,
//       ...
//     }),
//     ...ErpHrmReportParameterTransformer.select(),
//   });
//   return await ErpHrmReportParameterTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------