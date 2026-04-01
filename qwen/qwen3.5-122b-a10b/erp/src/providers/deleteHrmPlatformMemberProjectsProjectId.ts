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
  // Step 1: Get the project to find its organization_id
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      deleted_at: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  const organizationId: string & tags.Format<"uuid"> =
    project.hrm_platform_organization_id as string & tags.Format<"uuid">;
  // Step 2: Verify member has project:manage permission in the organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: organizationId,
        deleted_at: null,
      },
      select: {
        hrm_platform_role_id: true,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if role has project:manage permission
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
        deleted_at: null,
      },
      select: {
        hrm_platform_permission_id: true,
      },
    });
  const permissionIds = rolePermissions.map(
    (rp) => rp.hrm_platform_permission_id,
  );
  if (permissionIds.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if any of the permissions is project:manage
  const projectManagePermission =
    await MyGlobal.prisma.hrm_platform_permissions.findFirst({
      where: {
        id: {
          in: permissionIds,
        },
        code: "project:manage",
        deleted_at: null,
      },
    });
  if (projectManagePermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check for associated timelogs
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException("Project has associated timelogs", 409);
  }
  // Step 4-7: Create activity log and delete project in transaction
  const now = new Date();
  const nowString: string & tags.Format<"date-time"> = now.toISOString();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Create activity log
    const activityLogId: string & tags.Format<"uuid"> = v4() as string &
      tags.Format<"uuid">;
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: activityLogId,
        organization_id: organizationId,
        user_id: props.member.id,
        action_type: "project:deleted",
        target_entity: "project",
        target_id: props.projectId,
        details: JSON.stringify({
          deleted_by: props.member.id,
          deleted_at: nowString,
        }),
        created_at: now,
      },
    });
    // Delete project (cascade handles tasks and project_memberships)
    await tx.hrm_platform_projects.delete({
      where: { id: props.projectId },
    });
  });
}
