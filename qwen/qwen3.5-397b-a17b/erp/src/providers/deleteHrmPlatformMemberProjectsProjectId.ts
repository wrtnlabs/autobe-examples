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
  // Get employee record to access role and organization
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      deleted_at: null,
    },
    select: {
      id: true,
      member_id: true,
      organization_id: true,
      role_id: true,
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 403);
  }
  // Check if user has project:manage permission (owner and manager have it implicitly)
  const hasProjectManage =
    employee.role.name === "owner" ||
    employee.role.name === "manager" ||
    (await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        role_id: employee.role_id,
        permission: "project:manage",
      },
    })) !== null;
  if (!hasProjectManage) {
    throw new HttpException(
      "Forbidden: project:manage permission required",
      403,
    );
  }
  // Find project ensuring it belongs to member's organization and is not deleted
  await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      organization_id: employee.organization_id,
      deleted_at: null,
    },
  });
  // Check for associated timelogs
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Cannot delete project with existing timelogs. Archive or complete the project instead.",
      400,
    );
  }
  // Perform soft delete by updating deleted_at
  await MyGlobal.prisma.hrm_platform_projects.update({
    where: { id: props.projectId },
    data: {
      deleted_at: new Date(),
    },
  });
  // Create activity log entry
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      organization_id: employee.organization_id,
      action_type: "project.deleted",
      target_entity_type: "project",
      target_entity_id: props.projectId,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
}
