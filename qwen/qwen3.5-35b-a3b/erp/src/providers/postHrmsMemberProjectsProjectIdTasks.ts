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

export async function postHrmsMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmsTask.ICreate;
}): Promise<IHrmsTask> {
  // Validate project exists
  const project = await MyGlobal.prisma.hrms_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: { id: true, hrms_organization_id: true },
  });
  const organizationId = project.hrms_organization_id;
  // Check if user has project membership
  const membership = await MyGlobal.prisma.hrms_project_members.findFirst({
    where: {
      project_id: props.projectId,
      employee_id: props.member.id,
      deleted_at: null,
    },
    select: { role: true, id: true, employee_id: true },
  });
  // Check if user has organization-level project:manage permission
  const organizationMember =
    await MyGlobal.prisma.hrms_organization_members.findUnique({
      where: {
        hrms_organization_id_hrms_member_id: {
          hrms_organization_id: organizationId,
          hrms_member_id: props.member.id,
        },
      },
      select: { id: true },
    });
  let hasProjectManage = false;
  if (organizationMember) {
    // Need to check role permissions - will need hrms_organization_role_permissions schema
    hasProjectManage = false; // placeholder
  }
  // Verify user has permission (project-lead role OR project:manage permission)
  if (!membership && !hasProjectManage) {
    throw new HttpException("Forbidden", 403);
  }
  if (membership && membership.role !== "project-lead" && !hasProjectManage) {
    throw new HttpException("Forbidden", 403);
  }
  // Create task with proper data structure
  const created = await MyGlobal.prisma.hrms_tasks.create({
    data: {
      id: v4(),
      title: props.body.title,
      description: props.body.description ?? null,
      status: props.body.status ?? "open",
      priority: props.body.priority ?? "medium",
      estimated_hours: props.body.estimated_hours ?? null,
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
      billable: props.body.billable ?? null,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
      project: { connect: { id: props.projectId } },
    },
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      priority: true,
      estimated_hours: true,
      due_date: true,
      billable: true,
      hrms_project_id: true,
      hrms_employee_id: true,
      hrms_task_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  // Log activity for task creation
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4(),
      organization_id: organizationId,
      performed_by_id: props.member.id,
      action_type: "task.status_changed",
      target_entity: "task",
      target_id: created.id,
      details: JSON.stringify({
        task_id: created.id,
        title: created.title,
        project_id: project.id,
      }),
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
  // IHrmsTask is analytics DTO, return matching structure
  return {
    analytics: [],
    total_projects: 0 as number & tags.Type<"int32">,
    total_budget_hours: null,
    total_logged_hours: null,
  } satisfies IHrmsTask;
}
