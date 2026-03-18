import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { IErpHrmTask } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTask";
import { IErpHrmTaskHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmTaskHistory";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  taskId: string & tags.Format<"uuid">;
  body: IErpHrmTask.IUpdate;
}): Promise<IErpHrmTask> {
  // Step 1: Look up the project (404 if not found or deleted)
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: { id: props.projectId, deleted_at: null },
    select: { id: true, organization_id: true },
  });
  if (!project) throw new HttpException("Project not found", 404);
  // Step 2: Find the requesting member's organization member record
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: project.organization_id,
        member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (!orgMember) throw new HttpException("Forbidden", 403);
  // Step 3: Look up the task (must belong to project and not be deleted)
  const currentTask = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
    where: {
      id: props.taskId,
      erp_hrm_project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
      parent_id: true,
    },
  });
  if (!currentTask) throw new HttpException("Task not found", 404);
  // Step 4: Authorization — check project:manage permission OR project-lead role
  const hasProjectManage =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
      where: {
        role_id: orgMember.role_id,
        permission_code: "project:manage",
      },
      select: { id: true },
    });
  if (!hasProjectManage) {
    const isProjectLead =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.projectId,
          organization_member_id: orgMember.id,
          project_role: "project-lead",
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!isProjectLead) throw new HttpException("Forbidden", 403);
  }
  // Step 5: Validate assignee_id if provided as non-null
  if (props.body.assignee_id !== undefined && props.body.assignee_id !== null) {
    const assigneeProjectMember =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.projectId,
          organization_member_id: props.body.assignee_id,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (!assigneeProjectMember) {
      throw new HttpException("Assignee is not an active project member", 422);
    }
  }
  // Step 6: Validate parent_id if provided as non-null
  if (props.body.parent_id !== undefined && props.body.parent_id !== null) {
    if (props.body.parent_id === props.taskId) {
      throw new HttpException("A task cannot be its own parent", 422);
    }
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.parent_id,
        erp_hrm_project_id: props.projectId,
        deleted_at: null,
      },
      select: { id: true, parent_id: true },
    });
    if (!parentTask) {
      throw new HttpException("Parent task not found in this project", 422);
    }
    if (parentTask.parent_id !== null) {
      throw new HttpException(
        "Parent task is itself a subtask; only one level of nesting is permitted",
        422,
      );
    }
  }
  // Step 7: Determine if status is actually changing
  const statusChanged =
    props.body.status !== undefined &&
    props.body.status !== null &&
    props.body.status !== currentTask.status;
  // Step 8: Transaction — update task + conditionally insert task history
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.erp_hrm_tasks.update({
      where: { id: props.taskId },
      data: {
        ...(props.body.title !== undefined && { title: props.body.title }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.status !== undefined &&
          props.body.status !== null && { status: props.body.status }),
        ...(props.body.priority !== undefined &&
          props.body.priority !== null && { priority: props.body.priority }),
        ...(props.body.estimated_hours !== undefined && {
          estimated_hours: props.body.estimated_hours,
        }),
        ...(props.body.due_date !== undefined && {
          due_date:
            props.body.due_date !== null ? new Date(props.body.due_date) : null,
        }),
        ...(props.body.assignee_id !== undefined && {
          erp_hrm_organization_member_id: props.body.assignee_id,
        }),
        ...(props.body.parent_id !== undefined && {
          parent_id: props.body.parent_id,
        }),
        updated_at: now,
      },
    });
    if (statusChanged) {
      await tx.erp_hrm_task_histories.create({
        data: {
          id: v4(),
          erp_hrm_task_id: props.taskId,
          erp_hrm_organization_member_id: orgMember.id,
          old_status: currentTask.status,
          new_status: props.body.status!,
          created_at: now,
        },
      });
    }
  });
  // Step 9: Re-fetch and return the fully updated task via transformer
  const updatedTask = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...ErpHrmTaskTransformer.select(),
  });
  return ErpHrmTaskTransformer.transform(updatedTask);
}
