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
  const member = await MyGlobal.prisma.hrms_members.findUniqueOrThrow({
    where: { id: props.member.id, deleted_at: null },
    select: {
      id: true,
      organizationMembers: {
        select: { hrms_organization_id: true, deleted_at: true },
      },
    },
  });
  if (
    member.organizationMembers.every(
      (om: { hrms_organization_id: string; deleted_at: Date | null }) =>
        om.deleted_at !== null,
    )
  ) {
    throw new HttpException("No active organization membership", 403);
  }
  const organizationId = member.organizationMembers[0].hrms_organization_id;
  const projectFilter: Prisma.hrms_projectsWhereInput = {
    hrms_organization_id: organizationId,
    deleted_at: null,
  };
  if (props.body.projectIds && props.body.projectIds.length > 0) {
    projectFilter.id = { in: props.body.projectIds };
  }
  const dateFilter: Prisma.hrms_timelogsWhereInput = {
    deleted_at: null,
    date: {
      ...(props.body.startDate && {
        gte: new Date(props.body.startDate + "T00:00:00Z"),
      }),
      ...(props.body.endDate && {
        lte: new Date(props.body.endDate + "T23:59:59Z"),
      }),
    },
  };
  const whereInput: Prisma.hrms_timelogsWhereInput = {
    ...dateFilter,
    project: projectFilter,
  };
  const includeInactive = props.body.includeInactive === true;
  if (!includeInactive) {
    whereInput.employee = {
      status: "active",
    };
  }
  const timelogs = await MyGlobal.prisma.hrms_timelogs.groupBy({
    by: ["employee_id"],
    where: whereInput,
    _sum: {
      duration_minutes: true,
    },
    _count: { id: true },
  });
  const topN = props.body.topN ?? 10;
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const employeeIds = timelogs.map((t) => t.employee_id);
  const employees = await MyGlobal.prisma.hrms_employees.findMany({
    where: {
      id: { in: employeeIds },
      deleted_at: null,
    },
    select: {
      id: true,
      display_name: true,
      department: { select: { name: true } },
    },
  });
  const hoursByProjectFilter: Prisma.hrms_projectsWhereInput = {
    hrms_organization_id: organizationId,
    deleted_at: null,
    ...(props.body.projectIds && props.body.projectIds.length > 0
      ? { id: { in: props.body.projectIds } }
      : {}),
  };
  const hoursByProjectTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      deleted_at: null,
      ...(props.body.startDate && {
        date: { gte: new Date(props.body.startDate + "T00:00:00Z") },
      }),
      ...(props.body.endDate && {
        date: { lte: new Date(props.body.endDate + "T23:59:59Z") },
      }),
      project: hoursByProjectFilter,
      ...(includeInactive ? {} : { employee: { status: "active" } }),
    },
    select: {
      employee_id: true,
      project: { select: { name: true } },
      duration_minutes: true,
      billable: true,
    },
  });
  const hoursByProjectMap = new Map<
    string,
    Map<
      string,
      {
        total: number;
        billable: number;
      }
    >
  >();
  for (const tl of hoursByProjectTimelogs) {
    if (!hoursByProjectMap.has(tl.employee_id)) {
      hoursByProjectMap.set(tl.employee_id, new Map());
    }
    const projectMap = hoursByProjectMap.get(tl.employee_id)!;
    if (!projectMap.has(tl.project.name)) {
      projectMap.set(tl.project.name, { total: 0, billable: 0 });
    }
    const projectData = projectMap.get(tl.project.name)!;
    projectData.total += tl.duration_minutes;
    if (tl.billable) {
      projectData.billable += tl.duration_minutes;
    }
  }
  const metric = props.body.metric;
  const sortedTimelogs = [...timelogs].sort((a, b) => {
    const aTotalMinutes = a._sum.duration_minutes || 0;
    const aBillableMinutes = 0;
    const bTotalMinutes = b._sum.duration_minutes || 0;
    const bBillableMinutes = 0;
    if (metric === "billable") {
      return bBillableMinutes - aBillableMinutes;
    } else if (metric === "total") {
      return bTotalMinutes - aTotalMinutes;
    } else if (metric === "billable_rate") {
      const aRate = aTotalMinutes > 0 ? aBillableMinutes / aTotalMinutes : 0;
      const bRate = bTotalMinutes > 0 ? bBillableMinutes / bTotalMinutes : 0;
      return bRate - aRate;
    }
    return 0;
  });
  const limitedTimelogs = sortedTimelogs.slice(0, topN);
  const results = limitedTimelogs
    .map((tl) => {
      const totalMinutes = tl._sum.duration_minutes || 0;
      const totalHours = totalMinutes / 60;
      const billableMinutes = 0;
      const billableHours = billableMinutes / 60;
      const billableRate = totalHours > 0 ? billableHours / totalHours : 0;
      const employee = employees.find((e) => e.id === tl.employee_id);
      if (!employee) {
        return null;
      }
      const hoursByProject =
        props.body.projectIds && props.body.projectIds.length > 0
          ? Array.from(
              hoursByProjectMap.get(tl.employee_id)?.entries() || [],
            ).map(([projectName, data]) => ({
              projectName,
              totalHours: data.total / 60,
              billableHours: data.billable / 60,
            }))
          : undefined;
      return {
        id: tl.employee_id as string & tags.Format<"uuid">,
        displayName: employee.display_name,
        departmentName: employee.department?.name ?? "",
        totalHours,
        billableHours,
        billableRate,
        ...(props.body.projectIds && props.body.projectIds.length > 0
          ? { hoursByProject }
          : {}),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);
  const pageNum = page ?? 1;
  const limitNum = limit ?? 100;
  return {
    data: results,
    pagination: {
      current: pageNum,
      limit: limitNum,
      records: results.length,
      pages: Math.ceil(results.length / limitNum),
    },
  } as unknown as IHrmsProjectMember.ISummary;
}
