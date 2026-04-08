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
import { ErpHrmReportTransformer } from "../transformers/ErpHrmReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberReportsReportIdParameters(props: {
  member: MemberPayload;
  reportId: string & tags.Format<"uuid">;
  body: IErpHrmReportParameter.IUpdate;
}): Promise<IErpHrmReport> {
  // Validate group_by if provided
  if (props.body.groupBy !== undefined) {
    const VALID_GROUP_BY = ["employee", "project", "task"] as const;
    const isValidGroupBy = VALID_GROUP_BY.some((g) => g === props.body.groupBy);
    if (!isValidGroupBy) {
      throw new HttpException(
        "Invalid groupBy value. Must be one of: employee, project, task",
        400,
      );
    }
  }
  // Validate date range if both dates provided
  if (props.body.startDate !== undefined && props.body.endDate !== undefined) {
    if (props.body.startDate > props.body.endDate) {
      throw new HttpException("startDate must be on or before endDate", 400);
    }
  }
  // Find the report with organization context
  const report = await MyGlobal.prisma.erp_hrm_reports.findFirstOrThrow({
    where: {
      id: props.reportId,
    },
    select: {
      id: true,
      erp_hrm_organization_id: true,
    },
  });
  // Get member's organization context from employee record
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      erp_hrm_organization_id: true,
    },
  });
  // Verify report belongs to member's organization
  if (report.erp_hrm_organization_id !== employee.erp_hrm_organization_id) {
    throw new HttpException("Report not found", 404);
  }
  // Check if parameters already exist
  const existingParams =
    await MyGlobal.prisma.erp_hrm_report_parameters.findUnique({
      where: {
        erp_hrm_report_id: props.reportId,
      },
    });
  // Current timestamp for updates
  const now = new Date();
  if (existingParams) {
    // Update existing parameters with partial updates
    const updateData: Prisma.erp_hrm_report_parametersUpdateInput = {
      ...(props.body.startDate !== undefined && {
        start_date: { set: new Date(props.body.startDate) },
      }),
      ...(props.body.endDate !== undefined && {
        end_date: { set: new Date(props.body.endDate) },
      }),
      ...(props.body.employeeId !== undefined && {
        employee_id: { set: props.body.employeeId },
      }),
      ...(props.body.projectId !== undefined && {
        project_id: { set: props.body.projectId },
      }),
      ...(props.body.taskId !== undefined && {
        task_id: { set: props.body.taskId },
      }),
      ...(props.body.billable !== undefined && {
        billable: { set: props.body.billable },
      }),
      ...(props.body.groupBy !== undefined && {
        group_by: { set: props.body.groupBy },
      }),
      updated_at: { set: now },
    };
    await MyGlobal.prisma.erp_hrm_report_parameters.update({
      where: {
        erp_hrm_report_id: props.reportId,
      },
      data: updateData,
    });
  } else {
    // Create new parameters with defaults
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    await MyGlobal.prisma.erp_hrm_report_parameters.create({
      data: {
        id: v4(),
        erp_hrm_report_id: props.reportId,
        start_date: props.body.startDate ?? thirtyDaysAgo,
        end_date: props.body.endDate ?? now,
        employee_id: props.body.employeeId ?? null,
        project_id: props.body.projectId ?? null,
        task_id: props.body.taskId ?? null,
        billable: props.body.billable ?? null,
        group_by: props.body.groupBy ?? "employee",
        created_at: now,
        updated_at: now,
      },
    });
  }
  // Update report's updated_at timestamp
  await MyGlobal.prisma.erp_hrm_reports.update({
    where: {
      id: props.reportId,
    },
    data: {
      updated_at: now,
    },
  });
  // Fetch and return the complete report with transformer
  const updatedReport = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow(
    {
      ...ErpHrmReportTransformer.select(),
      where: {
        id: props.reportId,
      },
    },
  );
  return ErpHrmReportTransformer.transform(updatedReport);
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
// export async function patchErpHrmMemberReportsReportIdParameters(props: {
//   member: MemberPayload;
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