import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmsEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsEmployee";
import { IHrmsProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsProject";
import { IHrmsTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTask";
import { IHrmsTimelog } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimelog";
import { IHrmsTimer } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTimer";
import { IHrmsTopEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmsTopEmployee";
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

export async function putHrmsMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsProject.IUpdate;
}): Promise<IHrmsProject.ISummary> {
  // Step 1: Verify project exists and belongs to user's organization
  const project = await MyGlobal.prisma.hrms_projects.findFirst({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    include: {
      organization: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // Verify user has access to this organization
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findFirst({
      where: {
        hrms_member_id: props.member.id,
        hrms_organization_id: project.hrms_organization_id,
        deleted_at: null,
      },
    });
  if (organizationMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Validate input body - trust framework validation, skip manual checks
  // Step 3: Check business rule - cannot complete project with active timelogs
  if (props.body.status === "completed") {
    const hasTimelogs = await MyGlobal.prisma.hrms_timelogs.findFirst({
      where: {
        project_id: props.projectId,
        deleted_at: null,
      },
    });
    if (hasTimelogs !== null) {
      throw new HttpException(
        "Project cannot be completed because it has active timelogs",
        409,
      );
    }
  }
  // Step 4: Execute update
  const updatedProject = await MyGlobal.prisma.hrms_projects.update({
    where: { id: props.projectId },
    data: {
      name: props.body.name,
      ...(props.body.description !== undefined && {
        description: props.body.description,
      }),
      color_code: props.body.color_code,
      ...(props.body.status !== undefined && { status: props.body.status }),
      ...(props.body.budget_hours !== undefined && {
        budget_hours: props.body.budget_hours,
      }),
      ...(props.body.start_date !== undefined && {
        start_date: props.body.start_date,
      }),
      ...(props.body.end_date !== undefined && {
        end_date: props.body.end_date,
      }),
      updated_at: new Date(),
    },
    include: {
      organization: true,
    },
  });
  // Step 5: Calculate computed fields
  const timelogSum = await MyGlobal.prisma.hrms_timelogs.aggregate({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
    _sum: {
      duration_minutes: true,
    },
  });
  const actualHours =
    timelogSum._sum?.duration_minutes !== null &&
    timelogSum._sum?.duration_minutes !== undefined
      ? timelogSum._sum.duration_minutes / 60
      : 0;
  let budgetUtilizationPercentage: number | null = null;
  if (
    updatedProject.budget_hours !== null &&
    updatedProject.budget_hours !== 0
  ) {
    budgetUtilizationPercentage =
      (actualHours / updatedProject.budget_hours) * 100;
  }
  const pendingTasks = await MyGlobal.prisma.hrms_tasks.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
      status: { in: ["open", "pending"] },
    },
  });
  const inProgressTasks = await MyGlobal.prisma.hrms_tasks.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
      status: "in-progress",
    },
  });
  const completedTasks = await MyGlobal.prisma.hrms_tasks.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
      status: "completed",
    },
  });
  const closedTasks = await MyGlobal.prisma.hrms_tasks.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
      status: "closed",
    },
  });
  const totalTasks = await MyGlobal.prisma.hrms_tasks.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  const timelogCount = await MyGlobal.prisma.hrms_timelogs.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  // Step 6: Return project summary response
  const result = {
    id: updatedProject.id as string & tags.Format<"uuid">,
    name: updatedProject.name,
    description: updatedProject.description ?? "",
    color_code: updatedProject.color_code,
    organization_id: updatedProject.hrms_organization_id as string &
      tags.Format<"uuid">,
    organization_name: updatedProject.organization.name,
    status: updatedProject.status as "active" | "completed" | "archived",
    budget_hours: updatedProject.budget_hours,
    start_date: updatedProject.start_date?.toISOString() ?? null,
    end_date: updatedProject.end_date?.toISOString() ?? null,
    planned_hours: updatedProject.budget_hours ?? 0,
    actual_hours: actualHours,
    budget_utilization_percentage: budgetUtilizationPercentage,
    total_tasks: totalTasks,
    pending_tasks: pendingTasks,
    in_progress_tasks: inProgressTasks,
    completed_tasks: completedTasks,
    closed_tasks: closedTasks,
    timelog_count: timelogCount,
    created_at: updatedProject.created_at.toISOString(),
    updated_at: updatedProject.updated_at.toISOString(),
  } satisfies IHrmsProject.ISummary;
  return result;
}
