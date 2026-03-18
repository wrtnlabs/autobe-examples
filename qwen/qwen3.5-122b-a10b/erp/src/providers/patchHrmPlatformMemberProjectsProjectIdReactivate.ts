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

export async function patchHrmPlatformMemberProjectsProjectIdReactivate(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProject.IReactivate;
}): Promise<IHrmPlatformProject> {
  // Find and validate the project
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      select: {
        id: true,
        hrm_platform_organization_id: true,
        status: true,
        deleted_at: true,
      },
    },
  );
  // Verify organization membership (member must belong to project's organization)
  const memberInOrg = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      hrm_platform_user_id: props.member.id,
      hrm_platform_organization_id: project.hrm_platform_organization_id,
      deleted_at: null,
    },
  });
  if (memberInOrg === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Check project:manage permission via role
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirst({
    where: {
      id: memberInOrg.hrm_platform_role_id,
      deleted_at: null,
    },
    include: {
      permissions: {
        where: {
          permission: {
            code: "project:manage",
          },
        },
      },
    },
  });
  if (!role || role.permissions.length === 0) {
    throw new HttpException("Forbidden", 403);
  }
  // Verify project status is archived
  if (project.status !== "archived") {
    throw new HttpException(
      "Project is not in archived status and cannot be reactivated",
      400,
    );
  }
  // Update project status and record activity log in transaction
  const [updated] = await MyGlobal.prisma.$transaction(async (tx) => {
    const updated = await tx.hrm_platform_projects.update({
      where: { id: props.projectId },
      data: {
        status: "active",
        updated_at: new Date(),
      },
    });
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4(),
        user_id: props.member.id,
        organization_id: project.hrm_platform_organization_id,
        action_type: "project:reactivate",
        target_entity: "project",
        target_id: props.projectId,
        created_at: new Date(),
      },
    });
    return [updated] as const;
  });
  // Fetch and transform the updated project
  const result = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    ...HrmPlatformProjectTransformer.select(),
  });
  return await HrmPlatformProjectTransformer.transform(result);
}
