import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmTimeDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeDepartment";
import { IErpHrmTimeEmployeeDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeEmployeeDashboardSummary";
import { IErpHrmTimeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeMember";
import { IErpHrmTimeOrganizationDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeOrganizationDashboardSummary";
import { IErpHrmTimeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTimeRole";
import { ArrayUtil } from "@nestia/e2e";
import { Prisma } from "@prisma/sdk";
import { VariadicSingleton } from "tstl";
import typia, { tags } from "typia";

import { MyGlobal } from "../MyGlobal";
import { toISOStringSafe } from "../utils/toISOStringSafe";
import { ErpHrmTimeDepartmentAtSummaryTransformer } from "./ErpHrmTimeDepartmentAtSummaryTransformer";
import { ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer } from "./ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer";
import { ErpHrmTimeRoleAtSummaryTransformer } from "./ErpHrmTimeRoleAtSummaryTransformer";

export namespace ErpHrmTimeEmployeeDashboardSummaryTransformer {
  export type Payload = Prisma.erp_hrm_time_employeesGetPayload<
    ReturnType<typeof select>
  >;
  export function select() {
    return {
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
        organization:
          ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.select(),
        member: {
          select: {
            id: true,
          },
        },
        role: ErpHrmTimeRoleAtSummaryTransformer.select(),
        department: ErpHrmTimeDepartmentAtSummaryTransformer.select(),
        contracts: { select: { id: true } },
        projectMemberships: { select: { id: true } },
        assignedTasks: { select: { id: true } },
        timers: { select: { id: true } },
        timesheets: { select: { id: true } },
        timeReportRows: { select: { id: true } },
        dashboardSummary: { select: { id: true } },
      },
    } satisfies Prisma.erp_hrm_time_employeesFindManyArgs;
  }
  export async function transform(
    input: Payload,
  ): Promise<IErpHrmTimeEmployeeDashboardSummary> {
    return {
      id: input.id,
      erpHrmTimeOrganizationId: input.erp_hrm_time_organization_id,
      erpHrmTimeMemberId: input.erp_hrm_time_member_id,
      erpHrmTimeRoleId: input.erp_hrm_time_role_id,
      erpHrmTimeDepartmentId: input.erp_hrm_time_department_id ?? null,
      organization:
        await ErpHrmTimeOrganizationDashboardSummaryAtSummaryTransformer.transform(
          input.organization,
        ),
      member: { id: input.member.id } as IErpHrmTimeMember.ISummary,
      role: await ErpHrmTimeRoleAtSummaryTransformer.transform(input.role),
      department: input.department
        ? await ErpHrmTimeDepartmentAtSummaryTransformer.transform(
            input.department,
          )
        : null,
      positionTitle: input.position_title ?? null,
      employmentType: input.employment_type,
      status: input.status,
      createdAt: input.created_at.toISOString(),
      updatedAt: input.updated_at.toISOString(),
      deletedAt: input.deleted_at?.toISOString() ?? null,
    };
  }
}
