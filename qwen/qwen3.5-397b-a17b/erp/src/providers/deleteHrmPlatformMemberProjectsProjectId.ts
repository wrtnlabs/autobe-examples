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
  // 1. Find employee record to get organization and role
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found", 404);
  }
  // 2. Verify project exists, is not deleted, and belongs to employee's organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: {
      id: true,
      organization_id: true,
      deleted_at: true,
    },
  });
  if (!project || project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.organization_id !== employee.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify member has project:manage permission through their role
  const rolePermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.role_id,
        permission: "project:manage",
      },
    });
  if (!rolePermission) {
    throw new HttpException("Forbidden", 403);
  }
  // 4. Verify no timelogs exist for this project
  const hasTimelogs = await MyGlobal.prisma.hrm_platform_timelogs.findFirst({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (hasTimelogs) {
    throw new HttpException(
      "Project cannot be deleted because it has associated timelogs",
      409,
    );
  }
  // 5. Execute deletion in transaction (cascade handles tasks and project_members)
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the project
    await tx.hrm_platform_projects.update({
      where: { id: props.projectId },
      data: {
        deleted_at: new Date(),
        updated_at: new Date(),
      },
    });
    // Create activity log entry
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4(),
        organization_id: employee.organization_id,
        member_id: props.member.id,
        action_type: "project.deleted",
        target_entity_type: "project",
        target_entity_id: props.projectId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  });
}
