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

export async function deleteErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find the project (must exist and not be soft-deleted)
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      name: true,
      status: true,
      created_at: true,
    },
  });
  // Step 2: Resolve the requesting member's organizational identity
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Verify project:manage permission
  const permissionCount = await MyGlobal.prisma.erp_hrm_role_permissions.count({
    where: {
      role_id: orgMember.role_id,
      permission_code: "project:manage",
    },
  });
  if (permissionCount === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Check for existing timelogs — deletion blocked if any exist
  const timelogCount = await MyGlobal.prisma.erp_hrm_timelogs.count({
    where: {
      project_id: props.projectId,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project: one or more timelog records are associated with this project. Resolve all timelogs before deleting.",
      422,
    );
  }
  // Step 5: Execute atomic transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 5a. Collect task IDs for this project (includes subtasks — all share erp_hrm_project_id)
    const tasks = await tx.erp_hrm_tasks.findMany({
      where: { erp_hrm_project_id: props.projectId },
      select: { id: true },
    });
    const taskIds = tasks.map((t) => t.id);
    // 5b. Delete task histories for all tasks (explicit for ordering safety)
    if (taskIds.length > 0) {
      await tx.erp_hrm_task_histories.deleteMany({
        where: { erp_hrm_task_id: { in: taskIds } },
      });
    }
    // 5c. Delete all tasks for the project
    await tx.erp_hrm_tasks.deleteMany({
      where: { erp_hrm_project_id: props.projectId },
    });
    // 5d. Delete all project membership records
    await tx.erp_hrm_project_members.deleteMany({
      where: { project_id: props.projectId },
    });
    // 5e. Delete the project record itself
    await tx.erp_hrm_projects.delete({
      where: { id: props.projectId },
    });
    // 5f. Create activity log entry capturing deleted project snapshot
    await tx.erp_hrm_activity_logs.create({
      data: {
        id: v4(),
        organization_id: project.organization_id,
        organization_member_id: orgMember.id,
        action_type: "project_deleted",
        target_entity_type: "project",
        target_entity_id: project.id,
        details: JSON.stringify({
          id: project.id,
          name: project.name,
          status: project.status,
          created_at: project.created_at.toISOString(),
        }),
        created_at: new Date(),
      },
    });
  });
}
