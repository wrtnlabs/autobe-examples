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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmTaskTransformer } from "../transformers/ErpHrmTaskTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectIdTasksTaskId(props: {
  member: MemberPayload;
  projectId: string;
  taskId: string;
  body: IErpHrmTask.IUpdate;
}): Promise<IErpHrmTask> {
  // Get user's organization membership
  const organizationMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  // Check organization-level project management permission
  const hasProjectManagePermission =
    organizationMember.role.rolePermissions.some(
      (rp) => rp.permission === "project:manage",
    );
  // Check project-lead role for this specific project
  const projectMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        project_id: props.projectId,
        organization_member_id: organizationMember.id,
        role: "project-lead",
        deleted_at: null,
      },
    });
  // Reject if neither permission condition is met
  if (!hasProjectManagePermission && !projectMembership) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify task exists within the specified project
  const existingTask = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      project_id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      status: true,
    },
  });
  // Validate assigned_to_id if provided
  if (
    props.body.assigned_to_id !== undefined &&
    props.body.assigned_to_id !== null
  ) {
    const assigneeMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          project_id: props.projectId,
          organization_member_id: props.body.assigned_to_id,
          deleted_at: null,
        },
      });
    if (!assigneeMembership) {
      throw new HttpException("Assignee is not a member of this project", 400);
    }
  }
  // Validate parent_task_id if provided
  if (
    props.body.parent_task_id !== undefined &&
    props.body.parent_task_id !== null
  ) {
    // Ensure parent task exists in the same project
    const parentTask = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.parent_task_id,
        project_id: props.projectId,
        deleted_at: null,
      },
    });
    if (!parentTask) {
      throw new HttpException("Parent task not found in this project", 400);
    }
    // Prevent circular reference - parent task cannot be the task itself
    if (props.body.parent_task_id === props.taskId) {
      throw new HttpException("Task cannot be its own parent", 400);
    }
    // Check that parent task doesn't already have a parent (single-level nesting)
    const parentTaskWithParent = await MyGlobal.prisma.erp_hrm_tasks.findFirst({
      where: {
        id: props.body.parent_task_id,
        parent_task_id: { not: null },
        deleted_at: null,
      },
    });
    if (parentTaskWithParent) {
      throw new HttpException(
        "Cannot nest beyond one level - parent task already has a parent",
        400,
      );
    }
  }
  // Build update data
  const updateData: Prisma.erp_hrm_tasksUpdateInput = {
    ...(props.body.title !== undefined && { title: props.body.title }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.priority !== undefined && { priority: props.body.priority }),
    ...(props.body.due_date !== undefined && {
      due_date: props.body.due_date ? new Date(props.body.due_date) : null,
    }),
    ...(props.body.estimated_hours !== undefined && {
      estimated_hours: props.body.estimated_hours,
    }),
    ...(props.body.assigned_to_id !== undefined && {
      assignee: props.body.assigned_to_id
        ? { connect: { id: props.body.assigned_to_id } }
        : { disconnect: true },
    }),
    ...(props.body.parent_task_id !== undefined && {
      parentTask: props.body.parent_task_id
        ? { connect: { id: props.body.parent_task_id } }
        : { disconnect: true },
    }),
    updated_at: new Date(),
  };
  // Check if status is changing
  const isStatusChanging =
    props.body.status !== undefined &&
    props.body.status !== existingTask.status;
  // Perform update and create history if needed within transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update the task
    await tx.erp_hrm_tasks.update({
      where: { id: props.taskId },
      data: updateData,
    });
    // Create TaskHistory if status changed
    if (isStatusChanging && props.body.status) {
      await tx.erp_hrm_task_histories.create({
        data: {
          id: v4(),
          erp_hrm_task_id: props.taskId,
          erp_hrm_member_id: props.member.id,
          previous_status: existingTask.status,
          new_status: props.body.status,
          created_at: new Date(),
        },
      });
    }
  });
  // Fetch updated task with full relations
  const updatedTask = await MyGlobal.prisma.erp_hrm_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    ...ErpHrmTaskTransformer.select(),
  });
  return await ErpHrmTaskTransformer.transform(updatedTask);
}
