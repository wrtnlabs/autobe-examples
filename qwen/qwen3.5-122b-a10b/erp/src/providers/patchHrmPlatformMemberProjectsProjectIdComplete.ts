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
  // Find the project by projectId
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      name: true,
      status: true,
      deleted_at: true,
    },
  });
  // Verify project exists and is not soft-deleted
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  // Verify current status is 'active' or 'archived' (not already 'completed')
  if (project.status === "completed") {
    throw new HttpException("Project is already completed", 409);
  }
  if (project.status !== "active" && project.status !== "archived") {
    throw new HttpException("Invalid project status for completion", 400);
  }
  // Update the project status to 'completed' and updated_at timestamp
  await MyGlobal.prisma.hrm_platform_projects.update({
    where: { id: props.projectId },
    data: {
      status: "completed",
      updated_at: new Date(),
    },
  });
  // Fetch the updated project with all fields for response
  const updated = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      ...HrmPlatformProjectTransformer.select(),
    },
  );
  return await HrmPlatformProjectTransformer.transform(updated);
}
