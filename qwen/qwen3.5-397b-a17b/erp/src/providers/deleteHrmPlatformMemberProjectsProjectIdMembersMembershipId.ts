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

export async function deleteHrmPlatformMemberProjectsProjectIdMembersMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Get the member's employee record to verify organization and permissions
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      role_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Get the role and check for project:manage permission
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: {
      id: employee.role_id,
      organization_id: employee.organization_id,
      deleted_at: null,
    },
  });
  if (!role) {
    throw new HttpException("Role not found", 404);
  }
  // Check if role has project:manage permission (built-in roles: owner, manager have it)
  const hasProjectManage =
    role.name === "owner" || role.name === "manager" || role.built_in === true;
  if (!hasProjectManage) {
    // Check custom role permissions
    const rolePermissions =
      await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
        where: {
          role_id: role.id,
          deleted_at: null,
        },
        select: {
          permission: true,
        },
      });
    const hasPerm = rolePermissions.some(
      (p) => p.permission === "project:manage",
    );
    if (!hasPerm) {
      throw new HttpException(
        "Forbidden: project:manage permission required",
        403,
      );
    }
  }
  // Verify project exists and belongs to member's organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: {
      id: props.projectId,
      organization_id: employee.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (!project) {
    throw new HttpException("Project not found", 404);
  }
  // Verify membership exists by id only (project check done after fetch)
  const membership =
    await MyGlobal.prisma.hrm_platform_project_members.findUnique({
      where: {
        id: props.membershipId,
      },
      select: {
        id: true,
        hrm_platform_project_id: true,
        deleted_at: true,
      },
    });
  if (!membership) {
    throw new HttpException("Project membership not found", 404);
  }
  // Verify membership belongs to the specified project
  if (membership.hrm_platform_project_id !== props.projectId) {
    throw new HttpException("Project membership not found", 404);
  }
  // Idempotency: if already deleted, return success
  if (membership.deleted_at !== null) {
    return;
  }
  // Execute soft delete and activity log in a transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete the membership
    await tx.hrm_platform_project_members.update({
      where: {
        id: props.membershipId,
      },
      data: {
        deleted_at: new Date(),
      },
    });
    // Log the action to activity logs
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        organization_id: employee.organization_id,
        action_type: "project_member_removed",
        target_entity_type: "project_member",
        target_entity_id: props.membershipId,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      },
    });
  });
}
