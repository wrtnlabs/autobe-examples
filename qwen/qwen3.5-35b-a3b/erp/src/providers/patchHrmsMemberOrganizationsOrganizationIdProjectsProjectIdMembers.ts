import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProjectMember";
import { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import { IPageIHrmsProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIHrmsProjectMember";
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

export async function patchHrmsMemberOrganizationsOrganizationIdProjectsProjectIdMembers(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsProjectMember.IRequest;
}): Promise<IPageIHrmsProjectMember.ISummary> {
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  const maxLimit = 100;
  const effectiveLimit = Math.min(limit, maxLimit);
  const hasProjectFilter =
    props.body.projectIds && props.body.projectIds.length > 0;
  const projectNames = new Map<string, string>();
  const projectMemberships =
    await MyGlobal.prisma.hrms_project_members.findMany({
      where: {
        project_id: props.projectId,
        ...(props.body.includeInactive
          ? {}
          : {
              employee: {
                status: "active",
              },
            }),
      },
      include: {
        employee: {
          include: {
            department: { select: { name: true } },
          },
        },
      },
    });
  if (hasProjectFilter && props.body.projectIds) {
    const projects = await MyGlobal.prisma.hrms_projects.findMany({
      where: {
        id: { in: props.body.projectIds },
      },
      select: {
        id: true,
        name: true,
      },
    });
    for (const project of projects) {
      projectNames.set(project.id, project.name);
    }
  }
  const employeeIds = projectMemberships.map((pm) => pm.employee_id);
  const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
    where: {
      employee_id: { in: employeeIds },
      ...(hasProjectFilter
        ? { project_id: { in: props.body.projectIds! } }
        : {}),
      ...(props.body.startDate ? { date: { gte: props.body.startDate } } : {}),
      ...(props.body.endDate ? { date: { lte: props.body.endDate } } : {}),
    },
  });
  const employeeMetrics = new Map<
    string,
    {
      totalMinutes: number;
      billableMinutes: number;
      byProject: Map<
        string,
        {
          totalMinutes: number;
          billableMinutes: number;
        }
      >;
    }
  >();
  for (const timelog of timelogs) {
    const empId = timelog.employee_id;
    const existing = employeeMetrics.get(empId) || {
      totalMinutes: 0,
      billableMinutes: 0,
      byProject: new Map<
        string,
        {
          totalMinutes: number;
          billableMinutes: number;
        }
      >(),
    };
    const minutes = timelog.duration_minutes;
    existing.totalMinutes += minutes;
    if (timelog.billable) {
      existing.billableMinutes += minutes;
    }
    if (hasProjectFilter && props.body.projectIds) {
      const projMetrics = existing.byProject.get(timelog.project_id) || {
        totalMinutes: 0,
        billableMinutes: 0,
      };
      projMetrics.totalMinutes += minutes;
      if (timelog.billable) {
        projMetrics.billableMinutes += minutes;
      }
      existing.byProject.set(timelog.project_id, projMetrics);
    }
    employeeMetrics.set(empId, existing);
  }
  const results = projectMemberships.map((pm) => {
    const metrics = employeeMetrics.get(pm.employee_id);
    const totalMinutes = metrics ? metrics.totalMinutes : 0;
    const billableMinutes = metrics ? metrics.billableMinutes : 0;
    const totalHours = totalMinutes / 60;
    const billableHours = billableMinutes / 60;
    const billableRate = totalHours > 0 ? billableHours / totalHours : 0;
    let hoursByProject: IHrmsProjectMember.IHoursByProject[] | undefined;
    let projectName: string | undefined;
    if (
      hasProjectFilter &&
      props.body.projectIds &&
      props.body.projectIds.length > 0
    ) {
      if (props.body.projectIds.length === 1) {
        projectName = projectNames.get(props.body.projectIds[0]);
      } else if (metrics && metrics.byProject.size > 0) {
        hoursByProject = Array.from(metrics.byProject.entries()).map(
          ([projectId, projMetrics]) => ({
            projectName: projectNames.get(projectId) ?? "",
            totalHours: projMetrics.totalMinutes / 60,
            billableHours: projMetrics.billableMinutes / 60,
          }),
        );
      }
    }
    return {
      id: pm.employee_id,
      displayName: pm.employee.display_name,
      departmentName: pm.employee.department?.name ?? "",
      totalHours,
      billableHours,
      billableRate,
      projectName,
      hoursByProject,
    } satisfies IHrmsProjectMember.ISummary;
  });
  const sorted = results.sort((a, b) => {
    switch (props.body.metric) {
      case "billable":
        return b.billableHours - a.billableHours;
      case "total":
        return b.totalHours - a.totalHours;
      case "billable_rate":
        return b.billableRate - a.billableRate;
      default:
        return 0;
    }
  });
  const paginated = sorted.slice(skip, skip + effectiveLimit);
  const total = sorted.length;
  const totalPages = total > 0 ? Math.ceil(total / effectiveLimit) : 0;
  return {
    data: paginated,
    pagination: {
      current: page,
      limit: effectiveLimit,
      records: total,
      pages: totalPages,
    },
  } satisfies IPageIHrmsProjectMember.ISummary;
}
