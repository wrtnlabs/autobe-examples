import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberEmployeesEmployeeIdDashboardSummariesEmployeeDashboardSummaryId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  employeeDashboardSummaryId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeEmployeeDashboardSummary> {
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findFirstOrThrow({
      where: {
        id: props.employeeId,
        member: {
          id: props.member.id,
        },
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_time_organization_id: true,
        erp_hrm_time_member_id: true,
        erp_hrm_time_role_id: true,
        erp_hrm_time_department_id: true,
        position_title: true,
        employment_type: true,
        status: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
      },
    });
  const summary =
    await MyGlobal.prisma.erp_hrm_time_employee_dashboard_summaries.findUniqueOrThrow(
      {
        where: {
          id: props.employeeDashboardSummaryId,
        },
        select: {
          id: true,
          erp_hrm_time_employee_id: true,
          hours_logged_today: true,
          hours_logged_this_week: true,
          has_active_timer: true,
          active_timer_started_at: true,
          recent_timelog_count: true,
          pending_timesheet_status: true,
          recent_timelog_snapshot_at: true,
          assigned_open_task_count: true,
          assigned_in_progress_task_count: true,
          snapshot_at: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    );
  if (summary.erp_hrm_time_employee_id !== employee.id) {
    throw new HttpException("Not Found", 404);
  }
  return {
    id: employee.id,
    erpHrmTimeOrganizationId: employee.erp_hrm_time_organization_id,
    erpHrmTimeMemberId: employee.erp_hrm_time_member_id,
    erpHrmTimeRoleId: employee.erp_hrm_time_role_id,
    erpHrmTimeDepartmentId: employee.erp_hrm_time_department_id,
    organization: {
      id: employee.erp_hrm_time_organization_id,
      ownerMember: {
        id: props.member.id,
      },
      name: "",
      description: null,
      logoImageUrl: null,
      status: "",
      createdAt: employee.created_at.toISOString(),
      updatedAt: employee.updated_at.toISOString(),
      deletedAt: employee.deleted_at?.toISOString() ?? null,
    },
    member: {
      id: employee.erp_hrm_time_member_id,
    },
    role: {
      id: employee.erp_hrm_time_role_id,
      organization: {
        id: employee.erp_hrm_time_organization_id,
        ownerMember: {
          id: props.member.id,
        },
        name: "",
        description: null,
        logoImageUrl: null,
        status: "",
        createdAt: employee.created_at.toISOString(),
        updatedAt: employee.updated_at.toISOString(),
        deletedAt: employee.deleted_at?.toISOString() ?? null,
      },
      name: "",
      description: null,
      isBuiltin: false,
      createdAt: employee.created_at.toISOString(),
      updatedAt: employee.updated_at.toISOString(),
      deletedAt: employee.deleted_at?.toISOString() ?? null,
    },
    department:
      employee.erp_hrm_time_department_id === null
        ? null
        : {
            id: employee.erp_hrm_time_department_id,
            name: "",
            description: null,
            organization: {
              id: employee.erp_hrm_time_organization_id,
              ownerMember: {
                id: props.member.id,
              },
              name: "",
              description: null,
              logoImageUrl: null,
              status: "",
              createdAt: employee.created_at.toISOString(),
              updatedAt: employee.updated_at.toISOString(),
              deletedAt: employee.deleted_at?.toISOString() ?? null,
            },
            parentDepartment: null,
            created_at: employee.created_at.toISOString(),
            updated_at: employee.updated_at.toISOString(),
            deleted_at: employee.deleted_at?.toISOString() ?? null,
          },
    positionTitle: employee.position_title,
    employmentType: employee.employment_type,
    status: employee.status,
    createdAt: summary.created_at.toISOString(),
    updatedAt: summary.updated_at.toISOString(),
    deletedAt: summary.deleted_at?.toISOString() ?? null,
  };
}
