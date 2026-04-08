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

export async function putErpHrmAdminReportsReportId(props: {
  admin: AdminPayload;
  reportId: string & tags.Format<"uuid">;
  body: IErpHrmReport.IUpdate;
}): Promise<IErpHrmReport> {
  // Validate report exists
  const existing = await MyGlobal.prisma.erp_hrm_reports.findUnique({
    where: { id: props.reportId },
    select: { id: true },
  });
  if (existing === null) {
    throw new HttpException("Report not found", 404);
  }
  // Update report name if provided
  const now = new Date().toISOString();
  if (props.body.name !== undefined) {
    await MyGlobal.prisma.erp_hrm_reports.update({
      where: { id: props.reportId },
      data: {
        name: props.body.name,
        updated_at: new Date(),
      },
    });
  }
  // Update report parameters if provided
  if (props.body.parameter !== undefined) {
    const paramData: {
      start_date?: string;
      end_date?: string;
      employee_id?: string | null;
      project_id?: string | null;
      task_id?: string | null;
      billable?: boolean | null;
      group_by?: string;
      updated_at: Date;
    } = {
      updated_at: new Date(),
    };
    if (props.body.parameter.startDate !== undefined) {
      paramData.start_date = props.body.parameter.startDate;
    }
    if (props.body.parameter.endDate !== undefined) {
      paramData.end_date = props.body.parameter.endDate;
    }
    if (props.body.parameter.employeeId !== undefined) {
      paramData.employee_id = props.body.parameter.employeeId;
    }
    if (props.body.parameter.projectId !== undefined) {
      paramData.project_id = props.body.parameter.projectId;
    }
    if (props.body.parameter.taskId !== undefined) {
      paramData.task_id = props.body.parameter.taskId;
    }
    if (props.body.parameter.billable !== undefined) {
      paramData.billable = props.body.parameter.billable;
    }
    if (props.body.parameter.groupBy !== undefined) {
      paramData.group_by = props.body.parameter.groupBy;
    }
    await MyGlobal.prisma.erp_hrm_report_parameters.update({
      where: { erp_hrm_report_id: props.reportId },
      data: paramData,
    });
  }
  // Fetch and return updated report
  const updated = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    ...ErpHrmReportTransformer.select(),
  });
  return await ErpHrmReportTransformer.transform(updated);
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
// import { IErpHrmReportParameter } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmReportParameter";
// import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
// import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
// 
// // DON'T CHANGE FUNCTION NAME AND PARAMETERS,
// // ONLY YOU HAVE TO WRITE THIS FUNCTION BODY, AND USE IMPORTED.
// export async function putErpHrmAdminReportsReportId(props: {
//   admin: AdminPayload;
//   reportId: string & tags.Format<"uuid">;
//   body: IErpHrmReport.IUpdate;
// }): Promise<IErpHrmReport> {
//   await MyGlobal.prisma.erp_hrm_reports.update({
//     where: { ... },
//     data: { ... },
//   });
//   const updated = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow({
//     where: { ... },
//     ...ErpHrmReportTransformer.select(),
//   });
//   return await ErpHrmReportTransformer.transform(updated);
// }
// ```
//--------------------------------------------------------------