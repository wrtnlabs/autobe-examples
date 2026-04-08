import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function deleteHrmTimeTrackMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Fetch the task and verify it exists and is not already deleted
  const task = await MyGlobal.prisma.hrm_time_track_tasks.findUniqueOrThrow({
    where: {
      id: props.taskId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_track_project_id: true,
      parent_task_id: true,
    },
  });
  // 2. Load the project to check status and permissions
  const project =
    await MyGlobal.prisma.hrm_time_track_projects.findUniqueOrThrow({
      where: {
        id: task.hrm_time_track_project_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
        hrm_time_track_organization_id: true,
      },
    });
  // 3. Verify project is not archived or completed
  if (project.status === "archived" || project.status === "completed") {
    throw new HttpException(
      "Cannot delete task from archived or completed project",
      400,
    );
  }
  // 4. Verify user has permission (project:manage or project-lead)
  const employee = await MyGlobal.prisma.hrm_time_track_employees.findFirst({
    where: {
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_organization_id: project.hrm_time_track_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (!employee) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Check project membership and role
  const projectMember =
    await MyGlobal.prisma.hrm_time_track_project_members.findFirst({
      where: {
        hrm_time_track_employee_id: employee.id,
        hrm_time_track_project_id: project.id,
        deleted_at: null,
      },
      select: {
        role: true,
      },
    });
  if (!projectMember) {
    throw new HttpException("You are not a member of this project", 403);
  }
  // Check permissions - need project:manage OR project-lead role
  const hasProjectManagePermission =
    await MyGlobal.prisma.hrm_time_track_role_permissions.count({
      where: {
        permission: "project:manage",
        role: {
          employees: {
            some: {
              hrm_time_track_member_id: props.member.id,
              deleted_at: null,
            },
          },
        },
      },
    });
  if (
    hasProjectManagePermission === 0 &&
    projectMember.role !== "project-lead"
  ) {
    throw new HttpException("You do not have permission to delete tasks", 403);
  }
  // 5. Soft delete the task and all subtasks
  const now = new Date();
  await MyGlobal.prisma.$transaction([
    // Delete the main task
    MyGlobal.prisma.hrm_time_track_tasks.update({
      where: { id: props.taskId },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
    // Cascade delete subtasks
    MyGlobal.prisma.hrm_time_track_tasks.updateMany({
      where: {
        parent_task_id: props.taskId,
        deleted_at: null,
      },
      data: {
        deleted_at: now,
        updated_at: now,
      },
    }),
  ]);
  // 6. Record the deletion in activity logs
  await MyGlobal.prisma.hrm_time_track_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_time_track_organization_id: project.hrm_time_track_organization_id,
      hrm_time_track_member_id: props.member.id,
      hrm_time_track_task_id: props.taskId,
      activity_type: "task_deleted",
      description: `Task deleted from project ${project.id}`,
      created_at: now,
    },
  });
}
