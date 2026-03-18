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
  // Extract pagination with defaults
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 20;
  const skip = (page - 1) * limit;
  // Validate date range if both provided
  if (props.body.start_date && props.body.end_date) {
    const startDate = new Date(props.body.start_date);
    const endDate = new Date(props.body.end_date);
    if (startDate >= endDate) {
      throw new HttpException("Start date must be before end date", 400);
    }
  }
  // Get organization context from member
  const organizationMembership =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        hrms_organization_id: true,
      },
    });
  if (!organizationMembership) {
    throw new HttpException("Organization context not found", 404);
  }
  const organizationId = organizationMembership.hrms_organization_id;
  // Build base filter criteria
  const baseFilter: Prisma.hrms_employee_contractsWhereInput = {
    hrms_employee: {
      organizationMember: {
        hrms_organization_id: organizationId,
        deleted_at: null,
      },
    },
    deleted_at: null,
    ...(props.body.start_date && {
      start_date: {
        gte: new Date(props.body.start_date),
      },
    }),
    ...(props.body.end_date && {
      end_date: {
        lte: new Date(props.body.end_date),
      },
    }),
    ...(props.body.pay_period && {
      pay_period: props.body.pay_period,
    }),
    ...(props.body.department_id && {
      hrms_employee: {
        department_id: props.body.department_id,
      },
    }),
  };
  // Get total count
  const total = await MyGlobal.prisma.hrms_employee_contracts.count({
    where: baseFilter,
  });
  // Build aggregation queries for each pay_period
  const payPeriods: Array<"hourly" | "daily" | "weekly" | "monthly"> = [
    "hourly",
    "daily",
    "weekly",
    "monthly",
  ];
  const analyticsData: IHrmsEmployeeContract.ISummary[] = [];
  for (const payPeriod of payPeriods) {
    const periodFilter: Prisma.hrms_employee_contractsWhereInput = {
      ...baseFilter,
      pay_period: payPeriod,
    };
    // Get contracts for this pay period to calculate aggregations
    const contracts = await MyGlobal.prisma.hrms_employee_contracts.findMany({
      where: periodFilter,
      select: {
        id: true,
        start_date: true,
        end_date: true,
        pay_rate: true,
        hrms_employee_id: true,
      },
      skip,
      take: limit,
      orderBy: {
        start_date: "desc",
      },
    });
    if (contracts.length === 0) {
      continue;
    }
    // Calculate active contract count
    const activeContracts = await MyGlobal.prisma.hrms_employee_contracts.count(
      {
        where: {
          ...periodFilter,
          OR: [{ end_date: null }, { end_date: { gt: new Date() } }],
        },
      },
    );
    // Calculate pay rate statistics
    const payRates = contracts.map((c) => c.pay_rate);
    const avgPayRate =
      payRates.length > 0
        ? payRates.reduce((a, b) => a + b, 0) / payRates.length
        : 0;
    const minPayRate = payRates.length > 0 ? Math.min(...payRates) : 0;
    const maxPayRate = payRates.length > 0 ? Math.max(...payRates) : 0;
    // Calculate duration statistics
    const durations = contracts.map((c) => {
      const endDate = c.end_date ?? new Date();
      const startDate = c.start_date;
      const diffMs = endDate.getTime() - startDate.getTime();
      return Math.floor(diffMs / (1000 * 60 * 60 * 24));
    });
    const avgDuration =
      durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;
    const minDuration = durations.length > 0 ? Math.min(...durations) : 0;
    const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
    // Get employee data separately using hrms_employee_id
    const firstContract = contracts[0];
    const employee = firstContract
      ? await MyGlobal.prisma.hrms_employees.findUnique({
          where: { id: firstContract.hrms_employee_id },
          select: {
            id: true,
            display_name: true,
            position: true,
            department_id: true,
            status: true,
          },
        })
      : null;
    const employeeSummary: IHrmsEmployee.ISummary = {
      id:
        (employee?.id as string & tags.Format<"uuid">) ??
        "00000000-0000-0000-0000-000000000000",
      display_name: employee?.display_name ?? "Unknown",
      position: employee?.position ?? undefined,
      department_id: (employee?.department_id ??
        "00000000-0000-0000-0000-000000000000") as string & tags.Format<"uuid">,
      total_hours_logged: 0,
      timelog_count: 0,
      timesheets_submitted: 0,
      timesheets_approved: 0,
      timesheets_pending: 0,
      status: employee?.status ?? "unknown",
    };
    analyticsData.push({
      id: v4() as string & tags.Format<"uuid">,
      organization_context: organizationId as string & tags.Format<"uuid">,
      employee: employeeSummary,
      contract_count: contracts.length as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      active_contract_count: activeContracts as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      avg_pay_rate: avgPayRate,
      min_pay_rate: minPayRate,
      max_pay_rate: maxPayRate,
      avg_duration_days: avgDuration,
      min_duration_days: minDuration as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      max_duration_days: maxDuration as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
      pay_period: payPeriod,
      created_at: toISOStringSafe(new Date()) as string &
        tags.Format<"date-time">,
    } satisfies IHrmsEmployeeContract.ISummary);
  }
  // Apply sorting if specified
  if (props.body.sort) {
    const sortField = props.body.sort;
    analyticsData.sort((a, b) => {
      switch (sortField) {
        case "start_date":
          return a.avg_duration_days - b.avg_duration_days;
        case "end_date":
          return b.avg_duration_days - a.avg_duration_days;
        case "pay_rate":
          return a.avg_pay_rate - b.avg_pay_rate;
        case "pay_period":
          return a.pay_period.localeCompare(b.pay_period);
        case "working_hours_per_week":
          return 0; // Not available in summary, default to 0
        default:
          return 0;
      }
    });
  }
  // Apply pagination to analytics data
  const paginatedData = analyticsData.slice(skip, skip + limit);
  return {
    data: paginatedData as IHrmsEmployeeContract.ISummary[],
    pagination: {
      current: page as number & tags.Type<"int32"> & tags.Minimum<0>,
      limit: limit as number & tags.Type<"int32"> & tags.Minimum<0>,
      records: total as number & tags.Type<"int32"> & tags.Minimum<0>,
      pages: Math.ceil(total / limit) as number &
        tags.Type<"int32"> &
        tags.Minimum<0>,
    } satisfies IPage.IPagination,
  } satisfies IPageIHrmsEmployeeContract.ISummary;
}
