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

export async function getErpHrmMemberProjectsProjectId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
}): Promise<IErpHrmProject> {
  // Step 1: Fetch the project to determine its organization scope
  const projectBase = await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      organization_id: true,
    },
  });
  // Step 2: Resolve the member's organizational identity within that organization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: projectBase.organization_id,
        status: "active",
        deleted_at: null,
      },
      select: {
        role_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException(
      "Forbidden: not an active member of this organization",
      403,
    );
  }
  // Step 3: Verify the member's role includes 'project:view' permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      role_id: orgMember.role_id,
      permission_code: "project:view",
    },
    select: { id: true },
  });
  if (permission === null) {
    throw new HttpException("Forbidden: missing project:view permission", 403);
  }
  // Step 4: Fetch full project detail using transformer
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      organization_id: projectBase.organization_id,
      deleted_at: null,
    },
    ...ErpHrmProjectTransformer.select(),
  });
  return ErpHrmProjectTransformer.transform(project);
}
