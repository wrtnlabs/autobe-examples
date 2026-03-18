import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingDepartment";
import { IHrmTimeTrackingEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployee";
import { IHrmTimeTrackingEmployeeRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingEmployeeRole";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingUserAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingUserAccount";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingEmployeeRoleTransformer } from "../transformers/HrmTimeTrackingEmployeeRoleTransformer";
import { HrmTimeTrackingRoleTransformer } from "../transformers/HrmTimeTrackingRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberEmployeesEmployeeIdRolesEmployeeRoleId(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  employeeRoleId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingEmployeeRole> {
  const assignment =
    await MyGlobal.prisma.hrm_time_tracking_employee_roles.findUniqueOrThrow({
      where: {
        id: props.employeeRoleId,
      },
      select: {
        id: true,
        hrm_time_tracking_employee_id: true,
        hrm_time_tracking_role_id: true,
        effective_from: true,
        effective_to: true,
        created_at: true,
        updated_at: true,
        deleted_at: true,
        employee: {
          select: {
            id: true,
            timelogs: {
              select: {
                id: true,
              },
            },
            timesheets: {
              select: {
                id: true,
              },
            },
            organization: {
              select: {
                id: true,
                name: true,
                description: true,
                logo_image_url: true,
                currency: true,
                timezone: true,
                fiscal_start_month: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            employeeRoles: {
              select: {
                id: true,
              },
            },
            position_title: true,
            employment_type: true,
            status: true,
            userAccount: {
              select: {
                id: true,
                email: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
                password_hash: true,
              },
            },
            role: {
              select: {
                id: true,
                organization: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    logo_image_url: true,
                    currency: true,
                    timezone: true,
                    fiscal_start_month: true,
                    created_at: true,
                    updated_at: true,
                    deleted_at: true,
                  },
                },
                name: true,
                code: true,
                description: true,
                is_builtin: true,
                sort_order: true,
                created_at: true,
                updated_at: true,
                deleted_at: true,
              },
            },
            department: {
              select: {
                id: true,
                name: true,
                description: true,
                parent_department_id: true,
                created_at: true,
                updated_at: true,
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
            reviewedTimesheets: {
              select: {
                id: true,
              },
            },
            timerSessions: {
              select: {
                id: true,
              },
            },
            created_at: true,
            updated_at: true,
            deleted_at: true,
          },
        },
        role: HrmTimeTrackingRoleTransformer.select(),
      },
    });
  if (assignment.hrm_time_tracking_employee_id !== props.employeeId) {
    throw new HttpException("Not Found", 404);
  }
  return await HrmTimeTrackingEmployeeRoleTransformer.transform({
    id: assignment.id,
    hrm_time_tracking_employee_id: assignment.hrm_time_tracking_employee_id,
    hrm_time_tracking_role_id: assignment.hrm_time_tracking_role_id,
    effective_from: assignment.effective_from,
    effective_to: assignment.effective_to,
    created_at: assignment.created_at,
    updated_at: assignment.updated_at,
    deleted_at: assignment.deleted_at,
    employee: assignment.employee,
    role: assignment.role,
  });
}
