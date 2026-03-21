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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmReportTransformer } from "../transformers/ErpHrmReportTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberOrganizationsOrganizationIdReportsReportId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IErpHrmReport.IUpdate;
}): Promise<IErpHrmReport> {
  // 1. Validate report exists and belongs to the organization
  const existingReport =
    await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow({
      where: { id: props.reportId },
      select: {
        id: true,
        erp_hrm_organization_id: true,
        parameter: {
          select: {
            id: true,
          },
        },
      },
    });
  // Verify organization context matches
  if (existingReport.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException("Report not found", 404);
  }
  // 2. Prepare report update data
  const reportUpdateData: Prisma.erp_hrm_reportsUpdateInput = {
    updated_at: new Date(),
  };
  if (props.body.name !== undefined) {
    reportUpdateData.name = props.body.name;
  }
  // 3. Update report metadata
  await MyGlobal.prisma.erp_hrm_reports.update({
    where: { id: props.reportId },
    data: reportUpdateData,
  });
  // 4. Update parameters if provided
  if (props.body.parameter !== undefined) {
    const paramUpdate = props.body.parameter;
    // Validate date range
    if (
      paramUpdate.start_date !== undefined &&
      paramUpdate.end_date !== undefined
    ) {
      if (paramUpdate.start_date > paramUpdate.end_date) {
        throw new HttpException(
          "Start date must be before or equal to end date",
          400,
        );
      }
    }
    // Validate group_by values
    if (paramUpdate.group_by !== undefined) {
      const validGroupByValues = ["employee", "project", "task"];
      if (!validGroupByValues.includes(paramUpdate.group_by)) {
        throw new HttpException(
          `Invalid group_by value. Must be one of: ${validGroupByValues.join(", ")}`,
          400,
        );
      }
    }
    // Build parameter update data
    const paramUpdateData: Prisma.erp_hrm_report_parametersUpdateInput = {
      updated_at: new Date(),
    };
    if (paramUpdate.billable !== undefined) {
      paramUpdateData.billable = paramUpdate.billable;
    }
    if (paramUpdate.employee_id !== undefined) {
      if (paramUpdate.employee_id === null) {
        paramUpdateData.employee_id = null;
      } else {
        paramUpdateData.employee_id = paramUpdate.employee_id;
      }
    }
    if (paramUpdate.project_id !== undefined) {
      if (paramUpdate.project_id === null) {
        paramUpdateData.project_id = null;
      } else {
        paramUpdateData.project_id = paramUpdate.project_id;
      }
    }
    if (paramUpdate.task_id !== undefined) {
      if (paramUpdate.task_id === null) {
        paramUpdateData.task_id = null;
      } else {
        paramUpdateData.task_id = paramUpdate.task_id;
      }
    }
    if (paramUpdate.start_date !== undefined) {
      paramUpdateData.start_date = new Date(paramUpdate.start_date);
    }
    if (paramUpdate.end_date !== undefined) {
      paramUpdateData.end_date = new Date(paramUpdate.end_date);
    }
    if (paramUpdate.group_by !== undefined) {
      paramUpdateData.group_by = paramUpdate.group_by;
    }
    // Update parameters
    const parameterId = existingReport.parameter?.id;
    if (parameterId !== undefined) {
      await MyGlobal.prisma.erp_hrm_report_parameters.update({
        where: { id: parameterId },
        data: paramUpdateData,
      });
    }
  }
  // 5. Fetch and return updated report
  const updatedReport = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow(
    {
      where: { id: props.reportId },
      ...ErpHrmReportTransformer.select(),
    },
  );
  return await ErpHrmReportTransformer.transform(updatedReport);
}
