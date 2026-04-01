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
  // Get member's employee record to find their role
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      role_id: true,
      organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  // Check if role has project:manage permission
  const permission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: employee.role_id,
        permission: "project:manage",
        deleted_at: null,
      },
    });
  if (!permission) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify project exists and belongs to same organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findFirst({
    where: {
      id: props.projectId,
      organization_id: employee.organization_id,
      deleted_at: null,
    },
  });
  if (!project) {
    throw new HttpException("Project not found", 404);
  }
  // Verify membership exists, belongs to project, and is not deleted
  const membership =
    await MyGlobal.prisma.hrm_platform_project_members.findUniqueOrThrow({
      where: {
        id: props.membershipId,
      },
      select: {
        id: true,
        hrm_platform_project_id: true,
        hrm_platform_employee_id: true,
        deleted_at: true,
      },
    });
  if (membership.hrm_platform_project_id !== props.projectId) {
    throw new HttpException(
      "Membership does not belong to specified project",
      404,
    );
  }
  if (membership.deleted_at !== null) {
    throw new HttpException("Membership already deleted", 404);
  }
  // Soft delete the membership
  await MyGlobal.prisma.hrm_platform_project_members.update({
    where: {
      id: props.membershipId,
    },
    data: {
      deleted_at: new Date(),
    },
  });
  // Clear task assignments for this employee within the project
  await MyGlobal.prisma.hrm_platform_tasks.updateMany({
    where: {
      hrm_platform_project_id: props.projectId,
      hrm_platform_employee_id: membership.hrm_platform_employee_id,
    },
    data: {
      hrm_platform_employee_id: null,
    },
  });
}
