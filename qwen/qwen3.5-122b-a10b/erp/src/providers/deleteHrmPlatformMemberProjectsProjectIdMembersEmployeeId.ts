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
  // Verify project exists and get its organization
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
  // Verify membership exists
  const membership =
    await MyGlobal.prisma.hrm_platform_project_members.findFirst({
      where: {
        hrm_platform_project_id: props.projectId,
        hrm_platform_employee_id: props.employeeId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_project_id: true,
      },
    });
  if (membership === null) {
    throw new HttpException("Membership not found", 404);
  }
  // Verify employee exists and belongs to the same organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findUnique({
    where: { id: props.employeeId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      hrm_platform_role_id: true,
      deleted_at: true,
    },
  });
  if (employee === null) {
    throw new HttpException("Employee not found", 404);
  }
  if (employee.deleted_at !== null) {
    throw new HttpException("Employee not found", 404);
  }
  if (
    employee.hrm_platform_organization_id !==
    project.hrm_platform_organization_id
  ) {
    throw new HttpException("Employee not found", 404);
  }
  // Verify current member has project:manage permission
  // Get member's employee record in the project's organization
  const memberEmployee = await MyGlobal.prisma.hrm_platform_employees.findFirst(
    {
      where: {
        hrm_platform_user_id: props.member.id,
        hrm_platform_organization_id: project.hrm_platform_organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_role_id: true,
      },
    },
  );
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Find the project:manage permission by code (permissions are global, not org-scoped)
  const permission = await MyGlobal.prisma.hrm_platform_permissions.findFirst({
    where: {
      code: "project:manage",
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  if (permission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check if the member's role has this permission
  const hasPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: memberEmployee.hrm_platform_role_id,
        hrm_platform_permission_id: permission.id,
        deleted_at: null,
      },
    });
  if (hasPermission === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Perform soft delete on the membership
  await MyGlobal.prisma.hrm_platform_project_members.update({
    where: { id: membership.id },
    data: {
      deleted_at: new Date(),
    },
  });
}
