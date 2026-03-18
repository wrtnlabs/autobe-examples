import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberProjectsProjectIdMembersProjectMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  projectMemberId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.IUpdate;
}): Promise<IErpHrmProjectMember> {
  // Step 1: Resolve the project to get organization_id
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  // Step 2: Resolve caller's organization member and check project:manage permission
  const callerMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            permissions: {
              select: {
                permission_code: true,
              },
            },
          },
        },
      },
    });
  const hasPermission = callerMember.role.permissions.some(
    (p) => p.permission_code === "project:manage",
  );
  if (!hasPermission) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Resolve the project membership record
  await MyGlobal.prisma.erp_hrm_project_members.findFirstOrThrow({
    where: {
      id: props.projectMemberId,
      project_id: props.projectId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 4: Update the project_role
  await MyGlobal.prisma.erp_hrm_project_members.update({
    where: { id: props.projectMemberId },
    data: {
      project_role: props.body.project_role,
      updated_at: new Date(),
    },
  });
  // Step 5: Fetch and return the updated record
  const updated =
    await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
      where: { id: props.projectMemberId },
      ...ErpHrmProjectMemberTransformer.select(),
    });
  return ErpHrmProjectMemberTransformer.transform(updated);
}
