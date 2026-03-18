import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
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

export async function patchHrmsMemberProjectsTopEmployees(props: {
  member: MemberPayload;
  body: IHrmsProjectMember.IRequest;
}): Promise<IHrmsProjectMember.ISummary> {
  const metric: "billable" | "total" | "billable_rate" =
    props.body.metric ?? "billable";
  const topN: number &
    tags.Type<"int32"> &
    tags.Minimum<1> &
    tags.Maximum<100> = props.body.topN ?? 10;
  const includeInactive: boolean = props.body.includeInactive ?? false;
  const projectIds: (string & tags.Format<"uuid">)[] | undefined =
    props.body.projectIds;
  const startDate: (string & tags.Format<"date">) | undefined =
    props.body.startDate;
  const endDate: (string & tags.Format<"date">) | undefined =
    props.body.endDate;
  // Get employee's organizations
  const organizationMembers =
    await MyGlobal.prisma.hrms_organization_members.findMany({
      where: {
        hrms_member_id: props.member.id,
      },
      select: {
        hrms_organization_id: true,
      },
    });
  if (organizationMembers.length === 0) {
    return {
      id: "" as string & tags.Format<"uuid">,
      displayName: "",
      departmentName: "",
      totalHours: 0,
      billableHours: 0,
      billableRate: 0,
    };
  }
  const organizationId: string & tags.Format<"uuid"> =
    organizationMembers[0].hrms_organization_id;
  // Get active employees from organization
  const employeeWhere: Prisma.hrms_employeesWhereInput = {
    organizationMember: {
      hrms_organization_id: organizationId,
    },
    deleted_at: null,
    ...(includeInactive ? {} : { status: { not: "deactivated" } }),
  };
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: employeeWhere,
    select: {
      id: true,
      display_name: true,
      department_id: true,
    },
  });
  if (employees.length === 0) {
    return {
      id: "" as string & tags.Format<"uuid">,
      displayName: "",
      departmentName: "",
      totalHours: 0,
      billableHours: 0,
      billableRate: 0,
    };
  }
  const employeeIds: (string & tags.Format<"uuid">)[] = employees.map(
    (e) => e.id,
  );
  // Build timelogs where clause
  const timelogsWhere: Prisma.hrms_timelogsWhereInput = {
    deleted_at: null,
    employee_id: {
      in: employeeIds,
    },
  };
  // Apply date range filter using ISO string comparisons
  if (startDate) {
    const startDateObj: Date = new Date(startDate + "T00:00:00Z");
    timelogsWhere.date = {
      gte: startDateObj,
    };
  }
  if (endDate) {
    const endDateObj: Date = new Date(endDate + "T23:59:59Z");
    timelogsWhere.date = {
      ...(timelogsWhere.date as
        | Prisma.DateTimeFilter
        | Prisma.DateTimeFilter[]
        | undefined),
      lte: endDateObj,
    };
  }
  // Apply project filter
  if (projectIds && projectIds.length > 0) {
    timelogsWhere.project_id = {
      in: projectIds,
    };
  }
  // Aggregate total minutes by employee
  const aggregations = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: timelogsWhere,
    _sum: {
      duration_minutes: true,
    },
    orderBy: {
      employee_id: "asc",
    },
  });
  // Aggregate billable minutes by employee
  const billableAggregations = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: {
      ...timelogsWhere,
      billable: true,
    },
    _sum: {
      duration_minutes: true,
    },
    orderBy: {
      employee_id: "asc",
    },
  });
  // Build metric map
  const employeeMetrics = new Map<
    string,
    {
      totalMinutes: number;
      billableMinutes: number;
    }
  >();
  for (const agg of aggregations) {
    const empId: string & tags.Format<"uuid"> = agg.employee_id;
    employeeMetrics.set(empId, {
      totalMinutes: agg._sum?.duration_minutes ?? 0,
      billableMinutes: 0,
    });
  }
  for (const agg of billableAggregations) {
    const empId: string & tags.Format<"uuid"> = agg.employee_id;
    const existing = employeeMetrics.get(empId);
    if (existing) {
      existing.billableMinutes = agg._sum?.duration_minutes ?? 0;
    }
  }
  // Get department names
  const departments = await MyGlobal.prisma.hrms_departments.findMany({
    where: {
      organization: {
        id: organizationId,
      },
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
    },
  });
  const departmentMap: Map<string, string> = new Map(
    departments.map((d) => [d.id, d.name]),
  );
  // Build employee results with metrics
  const results: IHrmsProjectMember.ISummary[] = [];
  for (const employee of employees) {
    const metrics = employeeMetrics.get(employee.id);
    if (!metrics) continue;
    const totalHours: number = metrics.totalMinutes / 60;
    const billableHours: number = metrics.billableMinutes / 60;
    const billableRate: number =
      totalHours > 0 ? billableHours / totalHours : 0;
    results.push({
      id: employee.id as string & tags.Format<"uuid">,
      displayName: employee.display_name,
      departmentName: employee.department_id
        ? (departmentMap.get(employee.department_id) ?? "")
        : "",
      totalHours,
      billableHours,
      billableRate,
    });
  }
  // Sort by metric
  results.sort((a, b) => {
    switch (metric) {
      case "billable":
        return b.billableHours - a.billableHours;
      case "total":
        return b.totalHours - a.totalHours;
      case "billable_rate":
        return b.billableRate - a.billableRate;
      default:
        return b.billableHours - a.billableHours;
    }
  });
  // Apply topN limit and return top employee
  const topEmployee = results[0];
  if (!topEmployee) {
    return {
      id: "" as string & tags.Format<"uuid">,
      displayName: "",
      departmentName: "",
      totalHours: 0,
      billableHours: 0,
      billableRate: 0,
    };
  }
  return topEmployee;
}
