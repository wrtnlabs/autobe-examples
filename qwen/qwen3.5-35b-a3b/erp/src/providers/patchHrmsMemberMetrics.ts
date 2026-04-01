import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IWeekRange } from "@ORGANIZATION/PROJECT-api/lib/structures/IWeekRange";
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

export async function patchHrmsMemberMetrics(props: {
  member: MemberPayload;
  body: IHrmsTimelog.IRequest;
}): Promise<IHrmsTimelog> {
  const organizationCode = props.body.organization_code;
  if (!organizationCode) {
    throw new HttpException("Organization code is required", 400);
  }
  const organization = await MyGlobal.prisma.hrms_organizations.findFirst({
    where: {
      id: organizationCode,
      deleted_at: null,
    },
  });
  if (!organization) {
    throw new HttpException("Organization not found", 404);
  }
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: organization.id,
        deleted_at: null,
      },
    });
  if (!organizationMember) {
    throw new HttpException("No organization membership found", 404);
  }
  const metricTypes = props.body.metric_types ?? [
    "employees",
    "timelogs",
    "timesheets",
    "projects",
  ];
  const startDate: string & tags.Format<"date-time"> = props.body.date_range
    ? props.body.date_range.start_date
    : toISOStringSafe(
        new Date(Date.now() - new Date().getDay() * 24 * 60 * 60 * 1000),
      );
  const endDate: string & tags.Format<"date-time"> = props.body.date_range
    ? props.body.date_range.end_date
    : toISOStringSafe(
        new Date(Date.now() + (6 - new Date().getDay()) * 24 * 60 * 60 * 1000),
      );
  const activeEmployeesCount =
    metricTypes.includes("employees") && organization
      ? await MyGlobal.prisma.hrms_employees.count({
          where: {
            organizationMember: {
              hrms_organization_id: organization.id,
            },
            status: "active",
            deleted_at: null,
          },
        })
      : 0;
  const currentWeekHours =
    metricTypes.includes("timelogs") && organization
      ? ((
          await MyGlobal.prisma.hrms_timelogs.aggregate({
            where: {
              project: {
                hrms_organization_id: organization.id,
              },
              date: {
                gte: new Date(startDate),
                lte: new Date(endDate),
              },
              deleted_at: null,
            },
            _sum: {
              duration_minutes: true,
            },
          })
        )._sum.duration_minutes ?? 0) / 60
      : 0;
  const pendingTimesheetsCount =
    metricTypes.includes("timesheets") && organization
      ? await MyGlobal.prisma.hrms_timesheets.count({
          where: {
            employee: {
              organizationMember: {
                hrms_organization_id: organization.id,
              },
            },
            status: "submitted",
            deleted_at: null,
          },
        })
      : 0;
  const projectsWithHighUtilization: IHrmsProject.ISummary[] | undefined =
    metricTypes.includes("projects") && organization
      ? await (async () => {
          const projects = await MyGlobal.prisma.hrms_projects.findMany({
            where: {
              hrms_organization_id: organization.id,
              status: { in: ["active", "archived"] },
              budget_hours: { not: null, gt: 0 },
              deleted_at: null,
            },
          });
          const result: IHrmsProject.ISummary[] = [];
          for (const project of projects) {
            const timelogResult = await MyGlobal.prisma.hrms_timelogs.aggregate(
              {
                where: {
                  project_id: project.id,
                  deleted_at: null,
                },
                _sum: {
                  duration_minutes: true,
                },
              },
            );
            const actualHours = (timelogResult._sum.duration_minutes ?? 0) / 60;
            const budgetHours = project.budget_hours ?? 0;
            const utilization =
              budgetHours > 0 ? (actualHours / (budgetHours * 60)) * 100 : 0;
            if (utilization > 80) {
              const orgNameResult =
                await MyGlobal.prisma.hrms_organizations.findFirst({
                  where: {
                    id: project.hrms_organization_id,
                  },
                  select: { name: true },
                });
              const organizationName = orgNameResult?.name ?? "";
              result.push({
                id: project.id,
                name: project.name,
                description: project.description ?? "",
                color_code: project.color_code,
                organization_id: project.hrms_organization_id,
                organization_name: organizationName,
                status: project.status as "active" | "archived" | "completed",
                budget_hours: project.budget_hours,
                start_date: project.start_date
                  ? toISOStringSafe(project.start_date)
                  : null,
                end_date: project.end_date
                  ? toISOStringSafe(project.end_date)
                  : null,
                planned_hours: budgetHours,
                actual_hours: actualHours,
                budget_utilization_percentage:
                  utilization > 0 ? utilization : null,
                total_tasks: 0,
                pending_tasks: 0,
                in_progress_tasks: 0,
                completed_tasks: 0,
                closed_tasks: 0,
                timelog_count: 0,
                created_at: toISOStringSafe(project.created_at),
                updated_at: toISOStringSafe(project.updated_at),
              });
            }
          }
          return result;
        })()
      : undefined;
  const limit = props.body.limit ?? 100;
  if (
    projectsWithHighUtilization &&
    projectsWithHighUtilization.length > limit
  ) {
    projectsWithHighUtilization.splice(limit);
  }
  return {
    active_employees_count: activeEmployeesCount,
    current_week_hours: currentWeekHours,
    pending_timesheets_count: pendingTimesheetsCount,
    projects_with_high_utilization: projectsWithHighUtilization ?? [],
    current_week: {
      start_date: startDate.split("T")[0] as string & tags.Format<"date">,
      end_date: endDate.split("T")[0] as string & tags.Format<"date">,
    },
    generated_at: toISOStringSafe(new Date()),
  };
}
