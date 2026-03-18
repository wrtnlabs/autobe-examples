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

export async function deleteHrmPlatformMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Query the project to get its organization context
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        name: true,
        deleted_at: true,
      },
    },
  );
  // 2. Verify project is not already soft-deleted
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  // 3. Find the employee record for this member in the project's organization
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: project.hrm_platform_organization_id,
        deleted_at: null,
        status: "active",
      },
    });
  // 4. Validate the employee's role has project:manage permission
  const rolePermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.hrm_platform_role_id,
        permission: {
          code: "project:manage",
          deleted_at: null,
        },
      },
    });
  if (!rolePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Check for existing timelogs - deletion blocked if any exist
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException("Project has associated timelogs", 409);
  }
  // 6. Execute deletion in transaction with activity log
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete the project (tasks and project_members cascade automatically via onDelete: Cascade)
    await tx.hrm_platform_projects.delete({
      where: { id: props.projectId },
    });
    // Record the deletion in activity log
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: project.hrm_platform_organization_id,
        user_id: props.member.id,
        action_type: "project:deleted",
        target_entity: "project",
        target_id: props.projectId,
        details: JSON.stringify({
          projectId: props.projectId,
          projectName: project.name,
          deletedAt: toISOStringSafe(new Date()),
        }),
        created_at: toISOStringSafe(new Date()),
      },
    });
  });
}
