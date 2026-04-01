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
  const project = await MyGlobal.prisma.hrm_platform_projects.findUnique({
    where: { id: props.projectId },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      status: true,
      deleted_at: true,
    },
  });
  if (project === null || project.deleted_at !== null) {
    throw new HttpException("Project not found", 404);
  }
  if (project.status !== "active") {
    throw new HttpException(
      `Project is already ${project.status}, cannot archive`,
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        organization_id: project.hrm_platform_organization_id,
        user_id: props.member.id,
        action_type: "project:archived",
        target_entity: "project",
        target_id: props.projectId,
        details: props.body.reason
          ? JSON.stringify({ reason: props.body.reason })
          : null,
        created_at: new Date(),
      },
    });
    await tx.hrm_platform_projects.update({
      where: { id: props.projectId },
      data: {
        status: "archived",
        updated_at: new Date(),
      },
    });
  });
  const updated = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      ...HrmPlatformProjectTransformer.select(),
    },
  );
  return await HrmPlatformProjectTransformer.transform(updated);
}
