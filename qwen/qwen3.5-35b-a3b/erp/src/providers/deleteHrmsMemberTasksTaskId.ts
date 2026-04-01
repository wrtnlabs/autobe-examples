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

export async function deleteHrmsMemberTasksTaskId(props: {
  member: MemberPayload;
  taskId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Validate task exists and retrieve project context
  const task = await MyGlobal.prisma.hrms_tasks.findUniqueOrThrow({
    where: { id: props.taskId },
    include: {
      project: {
        select: {
          id: true,
          hrms_organization_id: true,
        },
      },
    },
  });
  // 2. Find the member's employee record
  const employee = await MyGlobal.prisma.hrms_employees.findFirst({
    where: {
      deleted_at: null,
      organizationMember: {
        hrms_member_id: props.member.id,
      },
    },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Check if employee is a project lead for this project
  const projectMembership =
    await MyGlobal.prisma.hrms_project_members.findFirst({
      where: {
        employee_id: employee.id,
        project_id: task.project.id,
        status: "active",
      },
    });
  if (projectMembership === null) {
    throw new HttpException("Forbidden", 403);
  }
  if (projectMembership.role !== "project-lead") {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Soft delete task
  await MyGlobal.prisma.hrms_tasks.update({
    where: { id: props.taskId },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // 5. Soft delete task status histories for this task
  await MyGlobal.prisma.hrms_task_status_histories.updateMany({
    where: {
      hrms_task_id: props.taskId,
      deleted_at: null,
    },
    data: {
      deleted_at: toISOStringSafe(new Date()),
    },
  });
  // 6. Log deletion in activity logs
  await MyGlobal.prisma.hrms_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: task.project.hrms_organization_id,
      performed_by_id: props.member.id,
      action_type: "task.deleted",
      target_entity: "task",
      target_id: props.taskId,
      details: `Task "${task.title}" deleted`,
      created_at: toISOStringSafe(new Date()),
      updated_at: toISOStringSafe(new Date()),
      deleted_at: null,
    },
  });
}
