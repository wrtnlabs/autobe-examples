import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
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

export async function putHrmPlatformMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IHrmPlatformProject.IUpdate;
}): Promise<IHrmPlatformProject> {
  // Query the project ensuring it is not deleted
  const project = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: {
        id: props.projectId,
        deleted_at: null,
      },
    },
  );
  // Check member has project:manage permission via employee role
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      include: {
        role: true,
      },
    });
  // Built-in roles owner/manager have full access, otherwise check custom role permissions
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
    throw new HttpException("Forbidden", 403);
  }
  // Build update data with only provided fields, converting string datetime to Date for Prisma
  const updateData: Prisma.hrm_platform_projectsUpdateInput = {
    updated_at: new Date(),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
    ...(props.body.color_code !== undefined && {
      color_code: props.body.color_code,
    }),
    ...(props.body.status !== undefined && { status: props.body.status }),
    ...(props.body.budget_hours !== undefined && {
      budget_hours: props.body.budget_hours,
    }),
    ...(props.body.started_at !== undefined && {
      started_at: props.body.started_at
        ? new Date(props.body.started_at)
        : null,
    }),
    ...(props.body.ended_at !== undefined && {
      ended_at: props.body.ended_at ? new Date(props.body.ended_at) : null,
    }),
  };
  // Perform update
  await MyGlobal.prisma.hrm_platform_projects.update({
    where: { id: props.projectId },
    data: updateData,
  });
  // Fetch updated project with transformer select
  const updated = await MyGlobal.prisma.hrm_platform_projects.findUniqueOrThrow(
    {
      where: { id: props.projectId },
      ...HrmPlatformProjectTransformer.select(),
    },
  );
  // Transform and return
  return await HrmPlatformProjectTransformer.transform(updated);
}
