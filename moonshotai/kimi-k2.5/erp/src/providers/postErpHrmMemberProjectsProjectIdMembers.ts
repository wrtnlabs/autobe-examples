import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganizationMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganizationMember";
import { IErpHrmProject } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProject";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmProjectMemberCollector } from "../collectors/ErpHrmProjectMemberCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberTransformer } from "../transformers/ErpHrmProjectMemberTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberProjectsProjectIdMembers(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  body: IErpHrmProjectMember.ICreate;
}): Promise<IErpHrmProjectMember> {
  // Get the member's organization membership with role permissions
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
      where: {
        user_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
        role: {
          select: {
            rolePermissions: {
              select: {
                permission: true,
              },
            },
          },
        },
      },
    });
  // Verify project management permission
  const hasProjectManagePermission = orgMember.role.rolePermissions.some(
    (rp: { permission: string }) => rp.permission === "project:manage",
  );
  if (!hasProjectManagePermission) {
    throw new HttpException(
      "Forbidden - project management permission required",
      403,
    );
  }
  // Verify project exists and belongs to the same organization
  await MyGlobal.prisma.erp_hrm_projects.findFirstOrThrow({
    where: {
      id: props.projectId,
      organization_id: orgMember.organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Verify target organization member exists and belongs to same organization
  await MyGlobal.prisma.erp_hrm_organization_members.findFirstOrThrow({
    where: {
      id: props.body.organizationMemberId,
      organization_id: orgMember.organization_id,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Check for existing active assignment (unique constraint)
  const existingAssignment =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        project_id: props.projectId,
        organization_member_id: props.body.organizationMemberId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (existingAssignment !== null) {
    throw new HttpException(
      "Organization member is already assigned to this project",
      409,
    );
  }
  // Create project member using Collector
  const created = await MyGlobal.prisma.erp_hrm_project_members.create({
    data: await ErpHrmProjectMemberCollector.collect({
      body: props.body,
      project: { id: props.projectId },
    }),
    ...ErpHrmProjectMemberTransformer.select(),
  });
  // Transform and return
  return ErpHrmProjectMemberTransformer.transform(created);
}
