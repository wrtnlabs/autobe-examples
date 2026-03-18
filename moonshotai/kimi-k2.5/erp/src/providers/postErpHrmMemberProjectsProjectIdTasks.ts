import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmTaskCollector } from "../collectors/ErpHrmTaskCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberProjectsProjectIdTasks(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmTask.ICreate;
}): Promise<IErpHrmTask> {
  // Verify project exists
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, organization_id: true },
  });
  // Get the member's organization membership to check permissions
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: { id: true, role_id: true },
    });
  // Check if user is a project lead for this project
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        project_id: props.projectId,
        organization_member_id: orgMember.id,
        deleted_at: null,
      },
      select: { role: true },
    });
  const isProjectLead = projectMembership?.role === "project-lead";
  // If not project lead, check for organization-level project management permission
  if (!isProjectLead) {
    const rolePermissions =
      await MyGlobal.prisma.erp_hrm_role_permissions.findMany({
        where: { role_id: orgMember.role_id },
        select: { permission: true },
      });
    const hasProjectManagePermission = rolePermissions.some(
      (rp) => rp.permission === "project:manage",
    );
    if (!hasProjectManagePermission) {
      throw new HttpException(
        "Forbidden - insufficient permissions to create tasks",
        403,
      );
    }
  }
  // Validate assigned_to_id if provided - must be a project member
  if (props.body.assigned_to_id) {
    const assigneeOrgMember =
      await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
        where: {
          id: props.body.assigned_to_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!assigneeOrgMember) {
      throw new HttpException("Assignee not found", 404);
    }
    const assigneeProjectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.projectId,
          organization_member_id: props.body.assigned_to_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!assigneeProjectMember) {
      throw new HttpException("Assignee is not a member of this project", 400);
    }
  }
  // Validate parent_task_id if provided
  if (props.body.parent_task_id) {
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findUnique({
      where: { id: props.body.parent_task_id },
      select: { id: true, project_id: true, parent_task_id: true },
    });
    if (!parentTask) {
      throw new HttpException("Parent task not found", 404);
    }
    if (parentTask.project_id !== props.projectId) {
      throw new HttpException(
        "Parent task must belong to the same project",
        400,
      );
    }
    if (parentTask.parent_task_id) {
      throw new HttpException(
        "Cannot create nested sub-tasks - parent task is already a child task",
        400,
      );
    }
  }
  // Create the task using collector
  const taskData = await ErpHrmTaskCollector.collect({
    body: props.body,
    erpHrmProjects: { id: props.projectId },
  });
  const createdTask = await MyGlobal.prisma.erp_hrm_tasks.create({
    data: taskData,
    ...ErpHrmTaskTransformer.select(),
  });
  // Create initial task history entry - record creation as change from empty to Open
  await MyGlobal.prisma.erp_hrm_task_histories.create({
    data: {
      id: v4(),
      previous_status: "",
      new_status: taskData.status,
      change_reason: "Task created",
      created_at: new Date(),
      task: { connect: { id: createdTask.id } },
      changedByMember: { connect: { id: props.member.id } },
    },
  });
  return await ErpHrmTaskTransformer.transform(createdTask);
}
