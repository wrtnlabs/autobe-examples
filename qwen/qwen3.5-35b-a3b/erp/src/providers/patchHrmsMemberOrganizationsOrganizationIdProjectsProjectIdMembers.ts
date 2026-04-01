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
  const topN = props.body.topN;
  // Get all project members with their employee and department info
  const projectMembers = await MyGlobal.prisma.hrms_project_members.findMany({
    where: {
      project_id: props.projectId,
      employee: {
        organizationMember: {
          organization: {
            id: props.organizationId,
          },
        },
      },
      ...(props.body.includeInactive !== true && {
        employee: {
          deleted_at: null,
        },
      }),
    },
    select: {
      id: true,
      employee_id: true,
      employee: {
        select: {
          display_name: true,
          department: {
            select: { name: true },
          },
        },
      },
    },
    orderBy: { employee: { display_name: "asc" } },
  });
  // Calculate metrics for each employee
  const metricData = await ArrayUtil.asyncMap(projectMembers, async (pm) => {
    const timelogFilters: Prisma.hrms_timelogsWhereInput = {
      deleted_at: null,
      employee_id: pm.employee_id,
      ...(props.body.startDate && { date: { gte: props.body.startDate } }),
      ...(props.body.endDate && { date: { lte: props.body.endDate } }),
      ...(props.body.projectIds &&
        props.body.projectIds.length > 0 && {
          project_id: { in: props.body.projectIds },
        }),
    };
    const timelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
      where: timelogFilters,
      select: {
        duration_minutes: true,
        billable: true,
      },
    });
    const totalMinutes = timelogs.reduce(
      (sum, t) => sum + t.duration_minutes,
      0,
    );
    const billableMinutes = timelogs.reduce(
      (sum, t) => sum + (t.billable ? t.duration_minutes : 0),
      0,
    );
    const totalHours = totalMinutes / 60;
    const billableHours = billableMinutes / 60;
    const billableRate = totalHours > 0 ? billableHours / totalHours : 0;
    // Calculate hours by project if projectIds filter is provided
    const hoursByProject =
      props.body.projectIds && props.body.projectIds.length > 0
        ? await MyGlobal.prisma.hrms_timelogs
            .findMany({
              where: {
                ...timelogFilters,
                employee_id: pm.employee_id,
                project_id: { in: props.body.projectIds },
              },
              select: {
                duration_minutes: true,
                billable: true,
                project: { select: { name: true } },
              },
            })
            .then((allTimelogs) => {
              const grouped: Record<
                string,
                {
                  total: number;
                  billable: number;
                }
              > = {};
              for (const tl of allTimelogs) {
                const projectName = tl.project.name;
                if (!grouped[projectName]) {
                  grouped[projectName] = { total: 0, billable: 0 };
                }
                grouped[projectName].total += tl.duration_minutes;
                if (tl.billable) {
                  grouped[projectName].billable += tl.duration_minutes;
                }
              }
              return Object.entries(grouped).map(
                ([projectName, { total, billable }]) => ({
                  projectName,
                  totalHours: total / 60,
                  billableHours: billable / 60,
                }),
              ) satisfies IHrmsProjectMember.IHoursByProject[];
            })
        : undefined;
    return {
      id: pm.employee_id as string & tags.Format<"uuid">,
      displayName: pm.employee.display_name,
      departmentName: pm.employee.department?.name ?? "",
      totalHours,
      billableHours,
      billableRate,
      projectName: undefined,
      hoursByProject: hoursByProject?.length ? hoursByProject : undefined,
    } satisfies IHrmsProjectMember.ISummary;
  });
  // Sort by metric
  metricData.sort((a, b) => {
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
  // Apply topN if specified
  const sortedData = topN ? metricData.slice(0, topN) : metricData;
  const total = sortedData.length;
  const paginatedData = sortedData.slice(skip, skip + limit);
  return {
    pagination: {
      current: page,
      limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: paginatedData,
  } satisfies IPageIHrmsProjectMember.ISummary;
}
