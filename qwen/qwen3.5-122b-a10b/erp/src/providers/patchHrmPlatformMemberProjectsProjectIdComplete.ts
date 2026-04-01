import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformProjectTransformer } from "../transformers/HrmPlatformProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberProjectsProjectIdComplete(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IHrmPlatformProject> {
  // Retrieve project
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        status: true,
        deleted_at: true,
        name: true,
        created_at: true,
        updated_at: true,
      },
    },
  );
  // Verify not soft-deleted
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  // Check current status
  if (project.status === "completed") {
    throw new HttpException("Project is already completed", 409);
  }
  if (project.status !== "active" && project.status !== "archived") {
    throw new HttpException("Invalid project status for completion", 400);
  }
  // Update project status
  await MyGlobal.prisma.hrm_platform_projects.update({
    where: { id: props.projectId },
    data: {
      status: "completed",
      updated_at: new Date(),
    },
  });
  // Log activity
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4() as string & tags.Format<"uuid">,
      organization_id: project.hrm_platform_organization_id,
      user_id: props.member.id,
      action_type: "project:completed",
      target_entity: "project",
      target_id: props.projectId,
      details: JSON.stringify({
        project_name: project.name,
        previous_status: project.status,
      }),
      created_at: new Date(),
    },
  });
  // Return updated project
  const updated = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      ...HrmPlatformProjectTransformer.select(),
    },
  );
  return await HrmPlatformProjectTransformer.transform(updated);
}
