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

export async function getErpHrmMemberProjectsProjectIdMembersProjectMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  projectMemberId: string & tags.Format<"uuid">;
}): Promise<IErpHrmProjectMember> {
  // Step 1: Fetch the project to get organization_id, ensure not soft-deleted
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
  // Step 2: Resolve calling member's organization member record for this org
  const callerOrgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  // Step 3: Authorization check
  // 3a. Check if caller's role has project:manage or project:view permission
  const permCount = await MyGlobal.prisma.erp_hrm_role_permissions.count({
    where: {
      role_id: callerOrgMember.role_id,
      permission_code: { in: ["project:manage", "project:view"] },
    },
  });
  if (permCount === 0) {
    // 3b. Check if caller is an active project member of this project
    const callerMembership =
      await MyGlobal.prisma.erp_hrm_project_members.findFirst({
        where: {
          organization_member_id: callerOrgMember.id,
          project_id: props.projectId,
          deleted_at: null,
        },
        select: { id: true },
      });
    if (callerMembership === null) {
      throw new HttpException("Forbidden", 403);
    }
  }
  // Step 4: Fetch the specific project member record
  const projectMember =
    await MyGlobal.prisma.erp_hrm_project_members.findFirstOrThrow({
      where: {
        id: props.projectMemberId,
        project_id: props.projectId,
        deleted_at: null,
      },
      ...ErpHrmProjectMemberTransformer.select(),
    });
  // Step 5: Transform and return
  return ErpHrmProjectMemberTransformer.transform(projectMember);
}
