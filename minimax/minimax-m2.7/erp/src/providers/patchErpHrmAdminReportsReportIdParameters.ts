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
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { ErpHrmReportTransformer } from "../transformers/ErpHrmReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmAdminReportsReportIdParameters(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IErpHrmReportParameter.IUpdate;
}): Promise<IErpHrmReport> {
  // Find the report
  await MyGlobal.prisma.erp_hrm_reports.findFirstOrThrow({
    where: { id: props.reportId },
  });
  // Validate date range if both are provided
  if (props.body.startDate !== undefined && props.body.endDate !== undefined) {
    if (props.body.startDate > props.body.endDate) {
      throw new HttpException("Start date must be on or before end date", 400);
    }
  }
  // Validate group_by field
  if (props.body.groupBy !== undefined) {
    const validGroupByValues = ["employee", "project", "task"] as const;
    if (!validGroupByValues.includes(props.body.groupBy)) {
      throw new HttpException(
        "Invalid group_by value. Valid options are: employee, project, task",
        400,
      );
    }
  }
  const now = new Date();
  // Check if parameters already exist
  const existingParams =
    await MyGlobal.prisma.erp_hrm_report_parameters.findUnique({
      where: { erp_hrm_report_id: props.reportId },
    });
  if (existingParams) {
    // Update existing parameters with partial values
    const updateData: Record<string, unknown> = {
      updated_at: now,
    };
    if (props.body.startDate !== undefined) {
      updateData.start_date = props.body.startDate;
    }
    if (props.body.endDate !== undefined) {
      updateData.end_date = props.body.endDate;
    }
    if (props.body.employeeId !== undefined) {
      updateData.employee_id = props.body.employeeId;
    }
    if (props.body.projectId !== undefined) {
      updateData.project_id = props.body.projectId;
    }
    if (props.body.taskId !== undefined) {
      updateData.task_id = props.body.taskId;
    }
    if (props.body.billable !== undefined) {
      updateData.billable = props.body.billable;
    }
    if (props.body.groupBy !== undefined) {
      updateData.group_by = props.body.groupBy;
    }
    await MyGlobal.prisma.erp_hrm_report_parameters.update({
      where: { erp_hrm_report_id: props.reportId },
      data: updateData,
    });
  } else {
    // Create new parameters (all required fields must be provided)
    if (
      props.body.startDate === undefined ||
      props.body.endDate === undefined ||
      props.body.groupBy === undefined
    ) {
      throw new HttpException(
        "startDate, endDate, and groupBy are required when creating new parameters",
        400,
      );
    }
    await MyGlobal.prisma.erp_hrm_report_parameters.create({
      data: {
        id: v4(),
        erp_hrm_report_id: props.reportId,
        start_date: props.body.startDate,
        end_date: props.body.endDate,
        employee_id: props.body.employeeId ?? null,
        project_id: props.body.projectId ?? null,
        task_id: props.body.taskId ?? null,
        billable: props.body.billable ?? null,
        group_by: props.body.groupBy,
        created_at: now,
        updated_at: now,
      },
    });
  }
  // Update report's updated_at timestamp
  await MyGlobal.prisma.erp_hrm_reports.update({
    where: { id: props.reportId },
    data: { updated_at: now },
  });
  // Fetch and return the full report with updated parameters
  const updatedReport = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow(
    {
      where: { id: props.reportId },
      ...ErpHrmReportTransformer.select(),
    },
  );
  return await ErpHrmReportTransformer.transform(updatedReport);
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
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function patchErpHrmAdminReportsReportIdParameters(props: {
//   admin: AdminPayload;
//   reportId: string & tags.Format<"uuid">;
//   body: IErpHrmReportParameter.IUpdate;
// }): Promise<IErpHrmReport> {
//   const record = await MyGlobal.prisma.erp_hrm_reports.findFirstOrThrow({
//     ...ErpHrmReportTransformer.select(),
//     where: { ... },
//   });
//   return await ErpHrmReportTransformer.transform(record);
// }
// ```
//--------------------------------------------------------------