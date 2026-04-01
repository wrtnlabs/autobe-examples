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
  // Fetch employee record to verify existence
  const employee = await MyGlobal.prisma.hrms_employees.findUniqueOrThrow({
    where: { id: props.employeeId },
    select: {
      id: true,
      organization_member_id: true,
      department_id: true,
    },
  });
  // Fetch organization member to verify relationship and get organization context
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findUniqueOrThrow({
      where: { id: employee.organization_member_id },
      select: {
        id: true,
        hrms_organization_id: true,
      },
    });
  // Fetch member's organization memberships to validate employee belongs to member's organization
  const memberOrganizations =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrms_organization_id: true,
      },
    });
  // Check if employee's organization is in member's organizations
  const employeeBelongsToMemberOrganization = memberOrganizations.some(
    (m) => m.hrms_organization_id === organizationMember.hrms_organization_id,
  );
  if (!employeeBelongsToMemberOrganization) {
    throw new HttpException("Forbidden", 403);
  }
  // Build filter from request body
  const whereFilter: Prisma.hrms_employee_contractsWhereInput = {
    hrms_employee_id: props.employeeId,
    deleted_at: null,
    ...(props.body.start_date !== undefined && {
      start_date: { gte: new Date(props.body.start_date) },
    }),
    ...(props.body.end_date !== undefined && {
      end_date: { lt: new Date(props.body.end_date) },
    }),
    ...(props.body.pay_period !== undefined && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.department_id !== undefined && {
      employee: {
        department_id: props.body.department_id,
      },
    }),
  };
  // Calculate pagination parameters
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const safeLimit = Math.min(Math.max(limit, 1), 100);
  const skip = (page - 1) * safeLimit;
  // Query contracts with employee relation
  const contracts = await MyGlobal.prisma.hrms_employee_contracts.findMany({
    where: whereFilter,
    skip,
    take: safeLimit,
    orderBy: { start_date: "asc" },
    include: { employee: true },
  });
  // Count total records
  const total = await MyGlobal.prisma.hrms_employee_contracts.count({
    where: whereFilter,
  });
  // Transform to response format
  const data = await ArrayUtil.asyncMap(contracts, async (contract) => {
    const startDate = new Date(contract.start_date);
    const endDate =
      contract.end_date !== null ? new Date(contract.end_date) : new Date();
    const durationMs = endDate.getTime() - startDate.getTime();
    const durationDays = Math.floor(durationMs / (1000 * 60 * 60 * 24));
    const activeContractCount = contract.end_date === null ? 1 : 0;
    const { department_id, position } = contract.employee;
    const departmentId: string & tags.Format<"uuid"> = (department_id ??
      "") satisfies string & tags.Format<"uuid">;
    const displayName: string = contract.employee.display_name;
    const empId: string = contract.employee.id;
    return {
      id: contract.id,
      organization_context: organizationMember.hrms_organization_id,
      employee: {
        id: empId,
        display_name: displayName,
        position: position ?? undefined,
        department_id: departmentId,
        total_hours_logged: 0,
        timelog_count: 0,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
        status: "active",
      } satisfies IHrmsEmployee.ISummary,
      contract_count: 1,
      active_contract_count: activeContractCount,
      avg_pay_rate: contract.pay_rate,
      min_pay_rate: contract.pay_rate,
      max_pay_rate: contract.pay_rate,
      avg_duration_days: durationDays,
      min_duration_days: durationDays,
      max_duration_days: durationDays,
      pay_period: typia.assert<"hourly" | "daily" | "weekly" | "monthly">(
        contract.pay_period,
      ),
      created_at: toISOStringSafe(contract.created_at),
    } satisfies IHrmsEmployeeContract.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: safeLimit,
      records: total,
      pages: Math.ceil(total / safeLimit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmsEmployeeContract.ISummary;
}
