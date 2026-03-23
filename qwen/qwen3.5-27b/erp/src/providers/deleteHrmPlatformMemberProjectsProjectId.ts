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
  // Step 1: Get member's session to determine organization context
  const session =
    await MyGlobal.prisma.hrm_platform_member_sessions.findUniqueOrThrow({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_platform_organization_id: true,
      },
    });
  if (session.hrm_platform_organization_id === null) {
    throw new HttpException("Organization context not set", 400);
  }
  // Step 2: Verify project exists and belongs to the member's organization
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
      },
      select: {
        id: true,
        organization_id: true,
        name: true,
      },
    },
  );
  // Verify organization ownership
  if (project.organization_id !== session.hrm_platform_organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check if any timelogs exist for this project
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
  });
  // Step 4: Block deletion if timelogs exist
  if (timelogCount > 0) {
    throw new HttpException(
      `Cannot delete project with ${timelogCount} existing timelog(s). Timelogs must be preserved for accurate time tracking records.`,
      400,
    );
  }
  // Step 5: Delete the project (cascade will handle related data)
  await MyGlobal.prisma.hrm_platform_projects.delete({
    where: {
      id: props.projectId,
    },
  });
  // Step 6: Create activity log entry for audit trail
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      hrm_platform_organization_id: session.hrm_platform_organization_id,
      hrm_platform_member_id: props.member.id,
      action_type: "project_deleted",
      target_entity_type: "project",
      target_entity_id: props.projectId,
      action_description: `Project "${project.name}" was permanently deleted.`,
      created_at: toISOStringSafe(new Date()),
    },
  });
}
