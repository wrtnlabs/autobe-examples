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
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
    },
  );
  const memberCount = await MyGlobal.prisma.hrm_platform_project_members.count({
    where: {
      hrm_platform_project_id: props.projectId,
    },
  });
  if (memberCount > 0) {
    throw new HttpException(
      "Project has assigned members. Remove all members before deletion.",
      400,
    );
  }
  const timelogCount = await MyGlobal.prisma.hrm_platform_timelogs.count({
    where: {
      hrm_platform_project_id: props.projectId,
      deleted_at: null,
    },
  });
  if (timelogCount > 0) {
    throw new HttpException(
      "Project has recorded timelogs. Timelogs must be removed or reassigned before deletion.",
      400,
    );
  }
  await MyGlobal.prisma.hrm_platform_projects.delete({
    where: {
      id: props.projectId,
    },
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      hrm_platform_organization_id: project.organization_id,
      hrm_platform_member_id: props.member.id,
      action_type: "project.deleted",
      target_entity_type: "project",
      target_entity_id: props.projectId,
      details: JSON.stringify({ project_name: project.name }),
      created_at: toISOStringSafe(new Date()),
    },
  });
}
