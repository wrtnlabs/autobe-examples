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
  // Query project
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: {
      id: true,
      hrms_organization_id: true,
      name: true,
      description: true,
      color_code: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
      organization: {
        select: {
          id: true,
          name: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  // Verify organization context
  const orgMember = await MyGlobal.prisma.hrms_organization_members.findFirst({
    where: {
      hrms_member_id: props.member.id,
      hrms_organization_id: project.hrms_organization_id,
    },
    select: {
      hrms_organization_role_id: true,
    },
  });
  if (!orgMember) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrms_organization_roles.findFirst({
    where: { id: orgMember.hrms_organization_role_id },
    select: { permissions: true },
  });
  if (
    !role ||
    !role.permissions.some((p) => p.permission === "project:manage")
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Validate status
  const validStatuses: ("active" | "archived" | "completed")[] = [
    "active",
    "archived",
    "completed",
  ];
  if (
    props.body.status !== undefined &&
    !validStatuses.includes(props.body.status)
  ) {
    throw new HttpException("Invalid status", 400);
  }
  // Validate status transitions (cannot go from archived back to active)
  if (props.body.status === "active" && project.status === "archived") {
    throw new HttpException("Archived projects cannot be reactivated", 400);
  }
  // Check for active timelogs if transitioning to completed
  if (props.body.status === "completed" && project.status !== "completed") {
    const activeTimelogs = await MyGlobal.prisma.hrms_timelogs.findMany({
      where: {
        project_id: project.id,
        deleted_at: null,
        billable: true,
      },
      select: { id: true },
      take: 1,
    });
    if (activeTimelogs.length > 0) {
      throw new HttpException(
        "Project cannot be completed because it has active timelogs requiring review",
        409,
      );
    }
  }
  // Update project
  const updatedProject = await MyGlobal.prisma.hrms_projects.update({
    where: { id: project.id },
    data: {
      name: props.body.name,
      description: props.body.description ?? null,
      color_code: props.body.color_code,
      status: props.body.status ?? project.status,
      budget_hours: props.body.budget_hours ?? null,
      start_date: props.body.start_date
        ? new Date(props.body.start_date)
        : null,
      end_date: props.body.end_date ? new Date(props.body.end_date) : null,
      updated_at: new Date(),
    },
    select: {
      id: true,
      hrms_organization_id: true,
      name: true,
      description: true,
      color_code: true,
      status: true,
      budget_hours: true,
      start_date: true,
      end_date: true,
      created_at: true,
      updated_at: true,
      organization: {
        select: {
          id: true,
          name: true,
          created_at: true,
          updated_at: true,
          deleted_at: true,
        },
      },
    },
  });
  return {
    id: updatedProject.id,
    name: updatedProject.name,
    description: updatedProject.description ?? "",
    color_code: updatedProject.color_code,
    organization_id: updatedProject.hrms_organization_id,
    organization_name: updatedProject.organization.name,
    status: typia.assert<"active" | "archived" | "completed">(
      updatedProject.status,
    ),
    budget_hours: updatedProject.budget_hours,
    start_date: updatedProject.start_date
      ? toISOStringSafe(updatedProject.start_date)
      : null,
    end_date: updatedProject.end_date
      ? toISOStringSafe(updatedProject.end_date)
      : null,
    created_at: toISOStringSafe(updatedProject.created_at),
    updated_at: toISOStringSafe(updatedProject.updated_at),
    planned_hours: updatedProject.budget_hours ?? 0,
    actual_hours: 0,
    budget_utilization_percentage: null,
    total_tasks: 0,
    pending_tasks: 0,
    in_progress_tasks: 0,
    completed_tasks: 0,
    closed_tasks: 0,
    timelog_count: 0,
  } satisfies IHrmsProject.ISummary;
}
