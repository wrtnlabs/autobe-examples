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

export async function patchHrmPlatformMemberProjectsProjectIdArchive(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProject.IArchive;
}): Promise<IHrmPlatformProject> {
  // Step 1: Find and validate project exists and is in active status
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        status: true,
      },
    } satisfies Prisma.hrm_platform_projectsFindManyArgs,
  );
  // Step 2: Validate project status is 'active'
  if (project.status !== "active") {
    throw new HttpException(
      `Project is not in active status (current: ${project.status})`,
      409,
    );
  }
  // Step 3: Perform transaction - update project status and create activity log
  const now = new Date();
  const updatedProject = await MyGlobal.prisma.$transaction(async (tx) => {
    // Update project status to 'archived'
    await tx.hrm_platform_projects.update({
      where: { id: props.projectId },
      data: {
        status: "archived",
        updated_at: now,
      },
    });
    // Create activity log entry using correct field names and relation connect
    const activityLogId = typia.assert<string & tags.Format<"uuid">>(v4());
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: activityLogId,
        organization: { connect: { id: project.hrm_platform_organization_id } },
        user: { connect: { id: props.member.id } },
        action_type: "project:archive",
        target_entity: "project",
        target_id: props.projectId,
        details: props.body.reason
          ? JSON.stringify({ reason: props.body.reason })
          : null,
        created_at: now,
      },
    });
    // Fetch updated project with full data for response
    return tx.hrm_platform_projects.findUniqueOrThrow({
      where: { id: props.projectId },
      ...HrmPlatformProjectTransformer.select(),
    } satisfies Prisma.hrm_platform_projectsFindManyArgs);
  });
  // Step 4: Transform and return
  return await HrmPlatformProjectTransformer.transform(updatedProject);
}
