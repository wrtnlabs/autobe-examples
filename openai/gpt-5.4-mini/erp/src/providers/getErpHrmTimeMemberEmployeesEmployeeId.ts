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
import { ErpHrmTimeDepartmentAtSummaryTransformer } from "../transformers/ErpHrmTimeDepartmentAtSummaryTransformer";
import { ErpHrmTimeEmployeeDashboardSummaryTransformer } from "../transformers/ErpHrmTimeEmployeeDashboardSummaryTransformer";
import { ErpHrmTimeRoleAtSummaryTransformer } from "../transformers/ErpHrmTimeRoleAtSummaryTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmTimeMemberEmployeesEmployeeId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
}): Promise<IErpHrmTimeEmployeeDashboardSummary> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirst({
      where: {
        erp_hrm_time_member_id: props.member.id,
        status: "active",
      },
      select: {
        erp_hrm_time_organization_id: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Forbidden", 403);
  }
  const employee =
    await MyGlobal.prisma.erp_hrm_time_employees.findUniqueOrThrow({
      where: {
        id: props.employeeId,
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
        organization: {
          select: {
            id: true,
            name: true,
            description: true,
            logo_image_url: true,
            status: true,
            created_at: true,
            updated_at: true,
            deleted_at: true,
            ownerMember: {
              select: {
                id: true,
              },
            },
            organizationMemberships: {
              select: {
                id: true,
              },
            },
            employees: {
              select: {
                id: true,
              },
            },
            setting: {
              select: {
                id: true,
              },
            },
            departments: {
              select: {
                id: true,
              },
            },
            roles: {
              select: {
                id: true,
              },
            },
            projects: {
              select: {
                id: true,
              },
            },
            timeReportRows: {
              select: {
                id: true,
              },
            },
            projectBudgetReportRows: {
              select: {
                id: true,
              },
            },
            weeklySummaryReportRows: {
              select: {
                id: true,
              },
            },
            organizationDashboardSummaries: {
              select: {
                id: true,
              },
            },
            activityLogEntries: {
              select: {
                id: true,
              },
            },
          },
        },
        member: {
          select: {
            id: true,
          },
        },
        role: ErpHrmTimeRoleAtSummaryTransformer.select(),
        department: ErpHrmTimeDepartmentAtSummaryTransformer.select(),
        timeReportRows: {
          select: {
            id: true,
          },
        },
        contracts: {
          select: {
            id: true,
          },
        },
        projectMemberships: {
          select: {
            id: true,
          },
        },
        assignedTasks: {
          select: {
            id: true,
          },
        },
        timers: {
          select: {
            id: true,
          },
        },
        timesheets: {
          select: {
            id: true,
          },
        },
        dashboardSummary: {
          select: {
            id: true,
          },
        },
      },
    });
  if (
    employee.erp_hrm_time_organization_id !==
    membership.erp_hrm_time_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  if (employee.erp_hrm_time_member_id !== props.member.id) {
    throw new HttpException("Forbidden", 403);
  }
  return await ErpHrmTimeEmployeeDashboardSummaryTransformer.transform(
    employee,
  );
}
