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
import { ErpHrmReportParameterTransformer } from "../transformers/ErpHrmReportParameterTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberOrganizationsOrganizationIdReportsReportIdParameters(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  reportId: string & tags.Format<"uuid">;
  body: IErpHrmReportParameter.IUpdate;
}): Promise<IErpHrmReportParameter> {
  // 1. Validate the report exists and belongs to the organization
  const report = await MyGlobal.prisma.erp_hrm_reports.findUniqueOrThrow({
    where: { id: props.reportId },
    select: {
      id: true,
      erp_hrm_organization_id: true,
      parameter: {
        select: { id: true },
      },
    },
  });
  if (report.erp_hrm_organization_id !== props.organizationId) {
    throw new HttpException("Report not found in this organization", 404);
  }
  // 2. Validate the member has report:view permission via their employee role
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
      status: true,
      role: {
        select: {
          id: true,
          rolePermissions: {
            select: {
              permission: true,
            },
          },
        },
      },
    },
  });
  if (employee.status !== "active") {
    throw new HttpException("Employee is not active", 403);
  }
  const hasReportViewPermission = employee.role.rolePermissions.some(
    (p: { permission: string }) => p.permission === "report:view",
  );
  if (!hasReportViewPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Validate entity filters belong to the organization
  const body = props.body;
  if (body.employee_id !== undefined && body.employee_id !== null) {
    const employeeExists = await MyGlobal.prisma.erp_hrm_employees.findFirst({
      where: {
        id: body.employee_id,
        erp_hrm_organization_id: props.organizationId,
        deleted_at: null,
      },
    });
    if (!employeeExists) {
      throw new HttpException("Employee not found in this organization", 400);
    }
  }
  if (body.project_id !== undefined && body.project_id !== null) {
    const projectExists = await MyGlobal.prisma.erp_hrm_projects.findFirst({
      where: {
        id: body.project_id,
        erp_hrm_organization_id: props.organizationId,
      },
    });
    if (!projectExists) {
      throw new HttpException("Project not found in this organization", 400);
    }
  }
  if (body.task_id !== undefined && body.task_id !== null) {
    const taskExists = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: body.task_id,
        project: {
          erp_hrm_organization_id: props.organizationId,
        },
      },
    });
    if (!taskExists) {
      throw new HttpException("Task not found in this organization", 400);
    }
  }
  // 4. Validate date range (start_date must be before end_date)
  if (body.start_date !== undefined && body.end_date !== undefined) {
    const startDate = new Date(body.start_date);
    const endDate = new Date(body.end_date);
    if (startDate >= endDate) {
      throw new HttpException("start_date must be before end_date", 400);
    }
  }
  // 5. Validate group_by value
  if (body.group_by !== undefined) {
    const validGroupByValues = ["employee", "project", "task"];
    if (!validGroupByValues.includes(body.group_by)) {
      throw new HttpException(
        "group_by must be one of: employee, project, task",
        400,
      );
    }
  }
  // 6. Update the parameters record
  const parameterId = report.parameter?.id;
  if (!parameterId) {
    throw new HttpException("Report parameters not found", 404);
  }
  const updated = await MyGlobal.prisma.erp_hrm_report_parameters.update({
    where: { id: parameterId },
    data: {
      ...(body.start_date !== undefined && {
        start_date: new Date(body.start_date),
      }),
      ...(body.end_date !== undefined && {
        end_date: new Date(body.end_date),
      }),
      ...(body.employee_id !== undefined && {
        employee_id: body.employee_id,
      }),
      ...(body.project_id !== undefined && {
        project_id: body.project_id,
      }),
      ...(body.task_id !== undefined && {
        task_id: body.task_id,
      }),
      ...(body.billable !== undefined && {
        billable: body.billable,
      }),
      ...(body.group_by !== undefined && {
        group_by: body.group_by,
      }),
      updated_at: new Date(),
    },
    ...ErpHrmReportParameterTransformer.select(),
  });
  // 7. Return the updated parameter with full details
  return await ErpHrmReportParameterTransformer.transform(updated);
}
