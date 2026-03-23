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

export async function deleteHrmPlatformMemberProjectsProjectIdMembershipsMembershipId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  membershipId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Find the membership record and verify it belongs to the specified project
  const membership =
    await MyGlobal.prisma.hrm_platform_project_memberships.findUniqueOrThrow({
      where: {
        id: props.membershipId,
        hrm_platform_project_id: props.projectId,
      },
      select: {
        id: true,
        hrm_platform_employee_id: true,
        hrm_platform_project_id: true,
        deleted_at: true,
      },
    });
  // Check if membership is already deleted
  if (membership.deleted_at !== null) {
    throw new HttpException("Project membership not found", 404);
  }
  // Soft delete the membership
  await MyGlobal.prisma.hrm_platform_project_memberships.update({
    where: { id: props.membershipId },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
  // Get employee and project details for activity log
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findUniqueOrThrow({
      where: { id: membership.hrm_platform_employee_id },
      select: {
        id: true,
        organization_id: true,
      },
    });
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: {
        id: true,
        name: true,
      },
    },
  );
  // Record activity log entry
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      hrm_platform_organization_id: employee.organization_id,
      hrm_platform_member_id: props.member.id,
      action_type: "project_membership_removed",
      target_entity_type: "project_membership",
      target_entity_id: props.membershipId,
      action_description: `Removed employee from project ${project.name}`,
      created_at: new Date(),
    },
  });
}
