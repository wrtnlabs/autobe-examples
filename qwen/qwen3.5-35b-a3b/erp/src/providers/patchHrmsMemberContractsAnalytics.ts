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

export async function patchHrmsMemberContractsAnalytics(props: {
  member: MemberPayload;
  body: IHrmsEmployeeContract.IRequest;
}): Promise<IPageIHrmsEmployeeContract.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Get organization context from member's organization membership
  const orgMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      include: {
        organization: {
          select: { id: true },
        },
      },
    });
  if (!orgMembership) {
    throw new HttpException("Organization membership not found", 404);
  }
  const organizationId: string & tags.Format<"uuid"> =
    orgMembership.organization.id;
  const departmentId = props.body.department_id ?? undefined;
  const startDate = props.body.start_date ?? undefined;
  const endDate = props.body.end_date ?? undefined;
  const payPeriod = props.body.pay_period ?? undefined;
  // Build parameterized query with filters
  const baseWhere: {
    hrms_organization_id: string;
    hrms_employee_id: string;
    start_date: string | null;
    end_date: string | null;
    pay_period: string | null;
    department_id: string | null;
  } = {
    hrms_organization_id: organizationId,
    hrms_employee_id: organizationId, // This will be used to join
    start_date: startDate ?? null,
    end_date: endDate ?? null,
    pay_period: payPeriod ?? null,
    department_id: departmentId ?? null,
  };
  // Execute aggregation using Prisma query builder with raw SQL parameters
  const results: Array<{
    id: string & tags.Format<"uuid">;
    organization_context: string & tags.Format<"uuid">;
    hrms_employee_id: string & tags.Format<"uuid">;
    department_id: (string & tags.Format<"uuid">) | null;
    pay_period: "hourly" | "daily" | "weekly" | "monthly";
    contract_count: number & tags.Type<"int32">;
    active_contract_count: number & tags.Type<"int32">;
    avg_pay_rate: number;
    min_pay_rate: number;
    max_pay_rate: number;
    avg_duration_days: number;
    min_duration_days: number & tags.Type<"int32">;
    max_duration_days: number & tags.Type<"int32">;
    created_at: string & tags.Format<"date-time">;
  }> = await MyGlobal.prisma.$queryRawUnsafe<
    Array<{
      id: string & tags.Format<"uuid">;
      organization_context: string & tags.Format<"uuid">;
      hrms_employee_id: string & tags.Format<"uuid">;
      department_id: (string & tags.Format<"uuid">) | null;
      pay_period: "hourly" | "daily" | "weekly" | "monthly";
      contract_count: number & tags.Type<"int32">;
      active_contract_count: number & tags.Type<"int32">;
      avg_pay_rate: number;
      min_pay_rate: number;
      max_pay_rate: number;
      avg_duration_days: number;
      min_duration_days: number & tags.Type<"int32">;
      max_duration_days: number & tags.Type<"int32">;
      created_at: string & tags.Format<"date-time">;
    }>
  >(`
    SELECT 
      gen_random_uuid() as id,
      om.hrms_organization_id as organization_context,
      e.id as hrms_employee_id,
      e.department_id,
      ec.pay_period,
      COUNT(*)::int as contract_count,
      SUM(CASE WHEN ec.end_date IS NULL OR ec.end_date > NOW() THEN 1 ELSE 0 END)::int as active_contract_count,
      COALESCE(AVG(ec.pay_rate), 0) as avg_pay_rate,
      COALESCE(MIN(ec.pay_rate), 0) as min_pay_rate,
      COALESCE(MAX(ec.pay_rate), 0) as max_pay_rate,
      COALESCE(AVG(EXTRACT(EPOCH FROM (COALESCE(ec.end_date, NOW()) - ec.start_date)) / 86400), 0) as avg_duration_days,
      COALESCE(MIN(EXTRACT(EPOCH FROM (COALESCE(ec.end_date, NOW()) - ec.start_date)) / 86400)::int, 0)::int as min_duration_days,
      COALESCE(MAX(EXTRACT(EPOCH FROM (COALESCE(ec.end_date, NOW()) - ec.start_date)) / 86400)::int, 0)::int as max_duration_days,
      NOW()::text as created_at
    FROM hrms_employee_contracts ec
    JOIN hrms_employees e ON ec.hrms_employee_id = e.id
    JOIN hrms_organization_members om ON e.organization_member_id = om.id
    WHERE om.deleted_at IS NULL
      AND ec.deleted_at IS NULL
      AND om.hrms_organization_id = ${organizationId}
      AND e.deleted_at IS NULL
      ${departmentId ? `AND e.department_id = ${departmentId}` : ""}
      ${startDate ? `AND ec.start_date >= '${startDate}'` : ""}
      ${endDate ? `AND (ec.end_date IS NULL OR ec.end_date <= '${endDate}')` : ""}
      ${payPeriod ? `AND ec.pay_period = '${payPeriod}'` : ""}
    GROUP BY om.hrms_organization_id, e.id, e.department_id, ec.pay_period
    ORDER BY ${
      props.body.sort === "pay_rate"
        ? "avg_pay_rate"
        : props.body.sort === "end_date"
          ? "ec.end_date"
          : props.body.sort === "start_date"
            ? "ec.start_date"
            : props.body.sort === "pay_period"
              ? "ec.pay_period"
              : "ec.start_date"
    } ${
      props.body.sort === "pay_rate"
        ? "DESC"
        : props.body.sort === "end_date"
          ? "DESC"
          : props.body.sort === "start_date"
            ? "DESC"
            : props.body.sort === "pay_period"
              ? "ASC"
              : "ASC"
    }
    LIMIT ${limit} OFFSET ${skip}
  `);
  // Get total count for pagination
  const totalQuery = await MyGlobal.prisma.$queryRawUnsafe<
    Array<{
      total: number;
    }>
  >(`
    SELECT COUNT(*)::int as total
    FROM hrms_employee_contracts ec
    JOIN hrms_employees e ON ec.hrms_employee_id = e.id
    JOIN hrms_organization_members om ON e.organization_member_id = om.id
    WHERE om.deleted_at IS NULL
      AND ec.deleted_at IS NULL
      AND om.hrms_organization_id = ${organizationId}
      AND e.deleted_at IS NULL
      ${departmentId ? `AND e.department_id = ${departmentId}` : ""}
      ${startDate ? `AND ec.start_date >= '${startDate}'` : ""}
      ${endDate ? `AND (ec.end_date IS NULL OR ec.end_date <= '${endDate}')` : ""}
      ${payPeriod ? `AND ec.pay_period = '${payPeriod}'` : ""}
    GROUP BY e.id, ec.pay_period
  `);
  const totalRecords: number & tags.Type<"int32"> & tags.Minimum<0> =
    totalQuery.length > 0
      ? (totalQuery[0].total as number & tags.Type<"int32"> & tags.Minimum<0>)
      : 0;
  // Build employee details map
  const employeeIds = Array.from(
    new Set(results.map((r) => r.hrms_employee_id)),
  );
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      id: { in: employeeIds },
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      position: true,
      department_id: true,
      status: true,
    },
  });
  const employeeMap = new Map<
    string,
    {
      display_name: string;
      position: string | null;
      department_id: string | null;
      status: string;
    }
  >();
  employees.forEach((emp) => {
    employeeMap.set(emp.id, {
      display_name: emp.display_name,
      position: emp.position,
      department_id: emp.department_id,
      status: emp.status,
    });
  });
  // Transform to response format
  const data: IHrmsEmployeeContract.ISummary[] = results.map((result) => {
    const employee = employeeMap.get(result.hrms_employee_id);
    if (!employee) {
      throw new HttpException("Employee not found", 404);
    }
    const departmentIdValue: string & tags.Format<"uuid"> =
      result.department_id ?? ("" as string & tags.Format<"uuid">);
    const countCast = (
      n: number,
    ): number & tags.Type<"int32"> & tags.Minimum<0> =>
      n satisfies number & tags.Type<"int32"> & tags.Minimum<0>;
    return {
      id: result.id,
      organization_context: result.organization_context,
      employee: {
        id: result.hrms_employee_id,
        display_name: employee.display_name,
        position: employee.position ?? undefined,
        department_id: departmentIdValue,
        total_hours_logged: 0,
        timelog_count: 0,
        timesheets_submitted: 0,
        timesheets_approved: 0,
        timesheets_pending: 0,
        status: employee.status,
      } satisfies IHrmsEmployee.ISummary,
      contract_count: countCast(result.contract_count),
      active_contract_count: countCast(result.active_contract_count),
      avg_pay_rate: result.avg_pay_rate,
      min_pay_rate: result.min_pay_rate,
      max_pay_rate: result.max_pay_rate,
      avg_duration_days: result.avg_duration_days,
      min_duration_days: countCast(result.min_duration_days),
      max_duration_days: countCast(result.max_duration_days),
      pay_period: result.pay_period,
      created_at: result.created_at,
    } satisfies IHrmsEmployeeContract.ISummary;
  });
  return {
    pagination: {
      current: page,
      limit: limit,
      records: totalRecords,
      pages: Math.ceil(totalRecords / limit),
    } satisfies IPage.IPagination,
    data,
  } satisfies IPageIHrmsEmployeeContract.ISummary;
}
