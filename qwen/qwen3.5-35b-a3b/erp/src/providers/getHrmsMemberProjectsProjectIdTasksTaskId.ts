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

export async function getHrmsMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
}): Promise<IHrmsTask> {
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      hrms_project_id: props.projectId,
      deleted_at: null,
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
          hrms_organization_id: true,
        },
      },
      assignedEmployee: {
        select: {
          id: true,
          display_name: true,
          position: true,
          employment_type: true,
          status: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
      parentTask: {
        select: {
          id: true,
          title: true,
        },
      },
    },
  });
  const projectAnalytics: IHrmsTask.ISummary[] = [
    {
      project_id: task.hrms_project_id,
      project_name: task.project.name,
      task_count: 1,
    },
  ];
  const totalProjects = await MyGlobal.prisma.hrms_projects.count({
    where: {
      hrms_organization_id: task.project.hrms_organization_id,
      deleted_at: null,
    },
  });
  const totalBudgetHours = await MyGlobal.prisma.hrms_projects.aggregate({
    where: {
      hrms_organization_id: task.project.hrms_organization_id,
      deleted_at: null,
    },
    _sum: { budget_hours: true },
  });
  const totalLoggedHours = await MyGlobal.prisma.hrms_timelogs.aggregate({
    where: {
      project_id: task.hrms_project_id,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  return {
    analytics: projectAnalytics,
    total_projects: totalProjects as number & tags.Type<"int32">,
    total_budget_hours: totalBudgetHours._sum.budget_hours ?? null,
    total_logged_hours: totalLoggedHours._sum?.duration_minutes
      ? Number(totalLoggedHours._sum.duration_minutes) / 60
      : null,
  };
}
