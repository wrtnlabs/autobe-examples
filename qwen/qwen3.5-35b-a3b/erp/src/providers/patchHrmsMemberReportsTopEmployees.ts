import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsTopEmployee";
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

export async function patchHrmsMemberReportsTopEmployees(props: {
  member: MemberPayload;
  body: IHrmsTopEmployee.IRequest;
}): Promise<IPageIHrmsTopEmployee.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Validate date range if provided
  if (props.body.dateRange?.startDate && props.body.dateRange?.endDate) {
    if (props.body.dateRange.startDate > props.body.dateRange.endDate) {
      throw new HttpException(
        "start_date must be before or equal to end_date",
        400,
      );
    }
  }
  // Use default to current week if not specified
  const now = new Date();
  const endOfWeek = new Date(now);
  const startOfWeek = new Date(endOfWeek);
  startOfWeek.setDate(endOfWeek.getDate() - 6);
  const effectiveStartDate =
    props.body.dateRange?.startDate || startOfWeek.toISOString().split("T")[0];
  const effectiveEndDate =
    props.body.dateRange?.endDate || endOfWeek.toISOString().split("T")[0];
  // Build WHERE clause for timelogs
  const timelogWhere: Prisma.hrms_timelogsWhereInput = {
    date: {
      gte: new Date(`${effectiveStartDate}T00:00:00.000Z`),
      lte: new Date(`${effectiveEndDate}T23:59:59.999Z`),
    },
    deleted_at: null,
    ...(props.body.employeeId && { employee_id: props.body.employeeId }),
    ...(props.body.projectId && { project_id: props.body.projectId }),
  };
  // Aggregate timelog data by employee with conditional billable sum
  const timelogAggregations = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: timelogWhere,
    _sum: {
      duration_minutes: true,
    },
    _count: {
      project_id: true,
      task_id: true,
    },
  });
  // Calculate billable hours using additional query
  const billableTimelogAggregations =
    await MyGlobal.prisma.hrms_timelogs.groupBy({
      by: ["employee_id"],
      where: {
        ...timelogWhere,
        billable: true,
      },
      _sum: {
        duration_minutes: true,
      },
    });
  // Build maps for aggregation data
  const totalHoursMap = new Map<string, number>();
  const billableHoursMap = new Map<string, number>();
  const projectCountMap = new Map<string, number>();
  const taskCountMap = new Map<string, number>();
  for (const agg of timelogAggregations) {
    totalHoursMap.set(agg.employee_id, agg._sum.duration_minutes ?? 0);
    projectCountMap.set(agg.employee_id, agg._count.project_id);
    taskCountMap.set(agg.employee_id, agg._count.task_id);
  }
  for (const agg of billableTimelogAggregations) {
    billableHoursMap.set(agg.employee_id, agg._sum.duration_minutes ?? 0);
  }
  // Get employee IDs from aggregations
  const employeeIds = Array.from(totalHoursMap.keys());
  if (employeeIds.length === 0) {
    return {
      pagination: {
        current: page,
        limit,
        records: 0,
        pages: 0,
      } satisfies IPage.IPagination,
      data: [],
    };
  }
  // Build employee WHERE clause (active only)
  const employeeWhere: Prisma.hrms_employeesWhereInput = {
    id: { in: employeeIds },
    status: "active",
    deleted_at: null,
  };
  // Get employee details with aggregation data
  const employeesWithAggregation =
    await MyGlobal.prisma.hrms_employees.findMany({
      where: employeeWhere,
      select: {
        id: true,
        display_name: true,
        position: true,
        department_id: true,
      },
    });
  // Build data with aggregation
  const data: IHrmsTopEmployee.ISummary[] = [];
  for (const employee of employeesWithAggregation) {
    const totalHours = totalHoursMap.get(employee.id) || 0;
    const billableHours = billableHoursMap.get(employee.id) || 0;
    const projectCount = projectCountMap.get(employee.id) || 0;
    const taskCount = taskCountMap.get(employee.id) || 0;
    data.push({
      id: employee.id as string & tags.Format<"uuid">,
      display_name: employee.display_name,
      position: employee.position ?? "",
      department_id: employee.department_id,
      total_hours: totalHours,
      billable_hours: billableHours,
      project_count: projectCount,
      task_count: taskCount,
    });
  }
  // Apply sorting
  const sortField = props.body.sort ?? "total_hours";
  data.sort((a, b) => {
    switch (sortField) {
      case "total_hours":
        return b.total_hours - a.total_hours;
      case "billable_hours":
        return b.billable_hours - a.billable_hours;
      case "project_count":
        return b.project_count - a.project_count;
      case "task_count":
        return b.task_count - a.task_count;
      case "employee_name":
        return a.display_name.localeCompare(b.display_name);
      case "department":
        if (a.department_id && b.department_id) {
          return a.department_id.localeCompare(b.department_id);
        } else if (a.department_id) {
          return -1;
        } else if (b.department_id) {
          return 1;
        }
        return 0;
      default:
        return b.total_hours - a.total_hours;
    }
  });
  // Apply pagination
  const paginatedData = data.slice(skip, skip + limit);
  // Count total
  const total = data.length;
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: paginatedData,
  };
}
