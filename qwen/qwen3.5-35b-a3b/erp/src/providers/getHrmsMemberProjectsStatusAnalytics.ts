import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
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

export async function getHrmsMemberProjectsStatusAnalytics(props: {
  member: MemberPayload;
}): Promise<IHrmsTask> {
  // Get member's organization
  const memberOrg = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      deleted_at: null,
    },
    select: { hrms_organization_id: true },
  });
  if (memberOrg === null) {
    throw new HttpException("Organization not found", 404);
  }
  const organizationId = memberOrg.hrms_organization_id;
  // Get all non-deleted projects for the organization
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
    },
  });
  // Get task counts per project
  const projectIds = projects.map((p) => p.id);
  const taskCounts =
    projectIds.length > 0
      ? await MyGlobal.prisma.hrms_tasks.groupBy({
          by: ["hrms_project_id"],
          where: {
            hrms_project_id: { in: projectIds },
            deleted_at: null,
          },
          _count: { id: true },
        })
      : [];
  // Build analytics array sorted by task_count descending
  const analytics: IHrmsTask.ISummary[] = projects
    .map((project) => {
      const taskCount =
        taskCounts.find((tc) => tc.hrms_project_id === project.id)?._count.id ??
        0;
      return {
        project_id: project.id as string & tags.Format<"uuid">,
        project_name: project.name,
        task_count: taskCount as number & tags.Type<"int32">,
      } satisfies IHrmsTask.ISummary;
    })
    .sort((a, b) => b.task_count - a.task_count);
  // Calculate total budget hours (excluding NULL)
  const totalBudgetHours = projects.reduce((sum, project) => {
    return sum + (project.budget_hours ?? 0);
  }, 0);
  // Get total logged hours from timelogs for organization projects
  const loggedHoursResult =
    projectIds.length > 0
      ? await MyGlobal.prisma.hrms_timelogs.aggregate({
          where: {
            project_id: { in: projectIds },
            deleted_at: null,
          },
          _sum: { duration_minutes: true },
        })
      : { _sum: { duration_minutes: 0 } };
  const totalLoggedHours = loggedHoursResult._sum.duration_minutes
    ? loggedHoursResult._sum.duration_minutes / 60
    : null;
  return {
    analytics: analytics,
    total_projects: projects.length as number & tags.Type<"int32">,
    total_budget_hours: totalBudgetHours === 0 ? null : totalBudgetHours,
    total_logged_hours: totalLoggedHours,
  } satisfies IHrmsTask;
}
