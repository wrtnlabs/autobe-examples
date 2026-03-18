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

export async function patchHrmsMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsProjectMember.IRequest;
}): Promise<IPageIHrmsProjectMember.ISummary> {
  // Validate project exists
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
  });
  // Get user's organization membership
  const userMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: project.hrms_organization_id,
      deleted_at: null,
    },
    include: {
      organizationRole: true,
    },
  });
  if (!userMember) {
    throw new HttpException("Forbidden", 403);
  }
  // Pagination params
  const page = props.body.page ?? 1;
  const limit = props.body.limit ?? 100;
  const skip = (page - 1) * limit;
  // Build where clause
  const whereClause: Prisma.hrms_project_membersWhereInput = {
    project_id: props.projectId,
    deleted_at: null,
  };
  // Filter by status based on includeInactive
  if (props.body.includeInactive === true) {
    // Include all statuses
  } else {
    whereClause.status = "active";
  }
  // Get total count
  const total = await MyGlobal.prisma.hrms_project_members.count({
    where: whereClause,
  });
  // Get members with employee details
  const data = await MyGlobal.prisma.hrms_project_members.findMany({
    where: whereClause,
    skip,
    take: limit,
    orderBy: { created_at: "desc" },
    include: {
      employee: {
        include: {
          department: true,
        },
      },
    },
  });
  // If timelog metrics are requested, we need to aggregate
  const metric = props.body.metric ?? "total";
  let transformedData: IHrmsProjectMember.ISummary[] = [];
  if (
    metric === "total" ||
    metric === "billable" ||
    metric === "billable_rate"
  ) {
    // Aggregate timelog data for each employee
    transformedData = await Promise.all(
      data.map(async (pm) => {
        const employee = pm.employee;
        const departmentName = employee.department?.name ?? "";
        // Query timelog metrics for this employee, optionally filtered by projectIds and date range
        const timelogMetrics = await MyGlobal.prisma.hrms_timelogs.groupBy({
          by: ["employee_id"],
          where: {
            employee_id: employee.id,
            ...(props.body.startDate && {
              date: {
                gte: new Date(props.body.startDate),
              },
            }),
            ...(props.body.endDate && {
              date: {
                lte: new Date(props.body.endDate),
              },
            }),
            ...(props.body.projectIds &&
              props.body.projectIds.length > 0 && {
                project_id: {
                  in: props.body.projectIds,
                },
              }),
          },
          _sum: {
            duration_minutes: true,
            ...(props.body.projectIds &&
              props.body.projectIds.length > 0 && {
                duration_minutes: true,
              }),
          },
        });
        const employeeTimelog = timelogMetrics.find(
          (t) => t.employee_id === employee.id,
        );
        const totalMinutes = employeeTimelog?._sum.duration_minutes ?? 0;
        const totalHours = totalMinutes / 60;
        // Billable hours
        const billableTimelogs = await MyGlobal.prisma.hrms_timelogs.aggregate({
          where: {
            employee_id: employee.id,
            billable: true,
            ...(props.body.startDate && {
              date: {
                gte: new Date(props.body.startDate),
              },
            }),
            ...(props.body.endDate && {
              date: {
                lte: new Date(props.body.endDate),
              },
            }),
            ...(props.body.projectIds &&
              props.body.projectIds.length > 0 && {
                project_id: {
                  in: props.body.projectIds,
                },
              }),
          },
          _sum: {
            duration_minutes: true,
          },
        });
        const billableMinutes = billableTimelogs._sum.duration_minutes ?? 0;
        const billableHours = billableMinutes / 60;
        const billableRate = totalHours > 0 ? billableHours / totalHours : 0;
        // Hours by project if filtered
        const hoursByProject: IHrmsProjectMember.IHoursByProject[] | undefined =
          props.body.projectIds && props.body.projectIds.length > 0
            ? await ArrayUtil.asyncMap(
                await MyGlobal.prisma.hrms_timelogs.groupBy({
                  by: ["project_id"],
                  where: {
                    employee_id: employee.id,
                    ...(props.body.startDate && {
                      date: {
                        gte: new Date(props.body.startDate),
                      },
                    }),
                    ...(props.body.endDate && {
                      date: {
                        lte: new Date(props.body.endDate),
                      },
                    }),
                    project_id: {
                      in: props.body.projectIds,
                    },
                  },
                  _sum: {
                    duration_minutes: true,
                  },
                }),
                async (t) => {
                  const projectRecord =
                    await MyGlobal.prisma.hrms_projects.findUnique({
                      where: { id: t.project_id },
                      select: { name: true },
                    });
                  return {
                    projectName: projectRecord?.name ?? "Unknown",
                    totalHours: (t._sum.duration_minutes ?? 0) / 60,
                    billableHours: 0, // Would need separate billable aggregation per project
                  } satisfies IHrmsProjectMember.IHoursByProject;
                },
              )
            : undefined;
        return {
          id: employee.id as string & tags.Format<"uuid">,
          displayName: employee.display_name,
          departmentName: departmentName,
          totalHours: totalHours,
          billableHours: billableHours,
          billableRate: billableRate,
          projectName:
            props.body.projectIds && props.body.projectIds.length > 0
              ? undefined
              : project.name,
          hoursByProject: hoursByProject,
        } satisfies IHrmsProjectMember.ISummary;
      }),
    );
  } else {
    // No metrics - simple mapping
    transformedData = data.map((pm) => {
      const employee = pm.employee;
      return {
        id: employee.id as string & tags.Format<"uuid">,
        displayName: employee.display_name,
        departmentName: employee.department?.name ?? "",
        totalHours: 0,
        billableHours: 0,
        billableRate: 0,
        projectName: project.name,
        hoursByProject: undefined,
      } satisfies IHrmsProjectMember.ISummary;
    });
  }
  return {
    pagination: {
      current: page,
      limit: limit,
      records: total,
      pages: Math.ceil(total / limit),
    } satisfies IPage.IPagination,
    data: transformedData,
  } satisfies IPageIHrmsProjectMember.ISummary;
}
