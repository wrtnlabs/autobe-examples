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

export async function deleteHrmPlatformMemberProjectsProjectIdMembersEmployeeId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  employeeId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Verify project exists and get organization context
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId, deleted_at: null },
      select: { id: true, hrm_platform_organization_id: true },
    },
  );
  // Step 2: Verify employee membership exists with deleted_at: null
  const membership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: props.employeeId,
        deleted_at: null,
      },
    });
  if (membership === null) {
    throw new HttpException("Project membership not found", 404);
  }
  // Step 3: Check authorization - verify current user has project:manage permission
  // Get the current member's employee record in the project's organization
  const currentEmployee =
    await MyGlobal.prisma.hrm_platform_employees.findFirst({
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: project.hrm_platform_organization_id,
        deleted_at: null,
      },
    });
  if (currentEmployee === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Get the role permissions for the current user's role
  const rolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: currentEmployee.hrm_platform_role_id,
        deleted_at: null,
      },
      select: { hrm_platform_permission_id: true },
    });
  // Get the permission ID for project:manage
  const projectManagePermission =
    await MyGlobal.prisma.hrm_platform_permissions.findFirst({
      where: {
        code: "project:manage",
        deleted_at: null,
      },
      select: { id: true },
    });
  if (projectManagePermission === null) {
    throw new HttpException("Permission not found", 500);
  }
  // Check if current user has the permission
  const hasPermission = rolePermissions.some(
    (rp) => rp.hrm_platform_permission_id === projectManagePermission.id,
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Perform soft delete by updating deleted_at timestamp
  const now = new Date();
  await MyGlobal.prisma.hrm_platform_project_members.update({
    where: { id: membership.id },
    data: { deleted_at: now },
  });
}
