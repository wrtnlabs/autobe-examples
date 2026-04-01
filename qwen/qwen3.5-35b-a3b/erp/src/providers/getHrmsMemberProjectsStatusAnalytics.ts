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
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        deleted_at: null,
      },
      select: { hrms_organization_id: true },
    });
  if (!organizationMember) {
    throw new HttpException("No organization found for member", 404);
  }
  const organizationId = organizationMember.hrms_organization_id;
  const projects = await MyGlobal.prisma.hrms_projects.findMany({
    where: {
      hrms_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      budget_hours: true,
      _count: {
        select: {
          tasks: true,
        },
      },
    },
  });
  const analytics = await ArrayUtil.asyncMap(projects, async (project) => {
    const taskCount = project._count.tasks;
    const budgetHours = project.budget_hours ?? 0;
    return {
      project_id: project.id,
      project_name: project.name,
      task_count: taskCount,
    } satisfies IHrmsTask.ISummary;
  });
  const totalProjects = projects.length;
  const totalBudgetHours = projects.reduce(
    (sum: number, project) => (project.budget_hours ?? 0) + sum,
    0,
  );
  const totalLoggedHours = 0;
  return {
    analytics,
    total_projects: totalProjects,
    total_budget_hours: totalBudgetHours > 0 ? totalBudgetHours : null,
    total_logged_hours: totalLoggedHours > 0 ? totalLoggedHours : null,
  } satisfies IHrmsTask;
}
