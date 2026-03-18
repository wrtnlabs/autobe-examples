import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployeeContract";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsEmployeeContract } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsEmployeeContract";
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

export async function patchHrmsMemberEmployeesEmployeeIdContracts(props: {
  member: MemberPayload;
  employeeId: string & tags.Format<"uuid">;
  body: IHrmsEmployeeContract.IRequest;
}): Promise<IPageIHrmsEmployeeContract.ISummary> {
  // 1. Verify employee exists and get organization context
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.employeeId, deleted_at: null },
    select: {
      id: true,
      organization_member_id: true,
      organizationMember: {
        select: {
          hrms_member_id: true,
          hrms_organization_id: true,
          hrms_organization_role_id: true,
          deleted_at: true,
        },
      },
    },
  });
  // 2. Authorization check: member must be the employee or have employee:view permission
  if (employee.organizationMember.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.organizationMember.hrms_member_id !== props.member.id) {
    // Member is not the employee, check for employee:view permission
    const memberOrgMember =
      await MyGlobal.prisma.hrms_organization_members.findFirst({
        where: {
          hrms_member_id: props.member.id,
          hrms_organization_id:
            employee.organizationMember.hrms_organization_id,
          deleted_at: null,
        },
        select: {
          hrms_organization_role_id: true,
        },
      });
    if (!memberOrgMember) {
      throw new HttpException("Forbidden", 403);
    }
    // Check if member's role has employee:view permission
    const hasPermission =
      await MyGlobal.prisma.hrms_organization_role_permissions.findFirst({
        where: {
          hrms_organization_role_id: memberOrgMember.hrms_organization_role_id,
          permission: "employee:view",
        },
      });
    if (!hasPermission) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // 3. Build filters from request body
  const filters: Prisma.hrms_employee_contractsWhereInput = {
    hrms_employee_id: props.employeeId,
    deleted_at: null,
  };
  // Apply date range filters
  if (props.body.start_date) {
    filters.start_date = { gte: new Date(props.body.start_date) };
  }
  if (props.body.end_date) {
    filters.end_date = { lte: new Date(props.body.end_date) };
  }
  // Apply pay period filter
  if (props.body.pay_period) {
    filters.pay_period = props.body.pay_period;
  }
  // Apply department filter via employee join
  if (props.body.department_id) {
    filters.employee = { department_id: props.body.department_id };
  }
  // 4. Build orderBy
  const sortOrder = "asc" as const;
  const orderBy: Prisma.hrms_employee_contractsOrderByWithRelationInput = props
    .body.sort
    ? ({
        [props.body.sort]: sortOrder,
      } satisfies Prisma.hrms_employee_contractsOrderByWithRelationInput)
    : { start_date: sortOrder };
  // 5. Apply pagination
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // 6. Query contracts
  const data = await MyGlobal.prisma.hrms_employee_contracts.findMany({
    where: filters,
    orderBy,
    skip,
    take: limit,
    select: {
      id: true,
      start_date: true,
      end_date: true,
      pay_rate: true,
      pay_period: true,
      working_hours_per_week: true,
      created_at: true,
      employee: {
        select: {
          id: true,
          display_name: true,
          position: true,
          department_id: true,
          status: true,
        },
      },
    },
  });
  // 7. Count total
  const total = await MyGlobal.prisma.hrms_employee_contracts.count({
    where: filters,
  });
  // 8. Transform to ISummary
  const transformedData = await ArrayUtil.asyncMap(data, async (contract) => {
    const activeContract =
      contract.end_date === null || contract.end_date > new Date();
    return {
      id: contract.id,
      organization_context: employee.organizationMember.hrms_organization_id,
      employee: {
        id: contract.employee.id,
        display_name: contract.employee.display_name,
        position: contract.employee.position ?? undefined,
        department_id: contract.employee.department_id!,
        total_hours_logged: 0,
        timelog_count: 0,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
        status: contract.employee.status,
      } satisfies IHrmsEmployee.ISummary,
      contract_count: 1,
      active_contract_count: activeContract ? 1 : 0,
      avg_pay_rate: contract.pay_rate,
      min_pay_rate: contract.pay_rate,
      max_pay_rate: contract.pay_rate,
      avg_duration_days: contract.end_date
        ? Math.floor(
            (contract.end_date.getTime() - contract.start_date.getTime()) /
              (1000 * 60 * 60 * 24),
          )
        : 0,
      min_duration_days: 0,
      max_duration_days: 0,
      pay_period: contract.pay_period as
        | "hourly"
        | "daily"
        | "weekly"
        | "monthly",
      created_at: toISOStringSafe(contract.created_at),
    } satisfies IHrmsEmployeeContract.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmsEmployeeContract.ISummary;
}
