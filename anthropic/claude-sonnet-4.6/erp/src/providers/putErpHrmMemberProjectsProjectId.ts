import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectTransformer } from "../transformers/ErpHrmProjectTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProject.IUpdate;
}): Promise<IErpHrmProject> {
  // Step 1: Look up the project to get its organization context
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId, deleted_at: null },
    select: { id: true, organization_id: true },
  });
  // Step 2: Verify the caller belongs to the same organization and is active
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        status: "active",
        deleted_at: null,
      },
      select: { id: true, role_id: true },
    });
  if (!orgMember) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Check if the role has project:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      role_id: orgMember.role_id,
      permission_code: "project:manage",
    },
    select: { id: true },
  });
  if (!permission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 4: Apply the update
  await MyGlobal.prisma.erp_hrm_projects.update({
    where: { id: props.projectId },
    data: {
      name: props.body.name,
      color: props.body.color,
      status: props.body.status,
      description: props.body.description ?? null,
      budget_hours: props.body.budget_hours ?? null,
      started_at:
        props.body.started_at != null ? new Date(props.body.started_at) : null,
      ended_at:
        props.body.ended_at != null ? new Date(props.body.ended_at) : null,
      updated_at: new Date(),
    },
  });
  // Step 5: Re-fetch and return the full updated project using the transformer
  const updated = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    ...ErpHrmProjectTransformer.select(),
  });
  return ErpHrmProjectTransformer.transform(updated);
}
