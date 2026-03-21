import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmProjectMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmProjectMember";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmProjectMemberAtInvertTransformer } from "../transformers/ErpHrmProjectMemberAtInvertTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getErpHrmMemberProjectsProjectIdMembersMemberId(props: {
  member: MemberPayload;
  projectId: string & tags.Format<"uuid">;
  memberId: string & tags.Format<"uuid">;
}): Promise<IErpHrmProjectMember.IInvert> {
  // Validate project exists and get organization context
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: { id: props.projectId },
    select: { id: true, erp_hrm_organization_id: true },
  });
  // Find requesting user's employee record in this organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: { id: true, erp_hrm_role_id: true },
  });
  // Check if user has project:manage permission
  const roleWithPermissions =
    await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
      where: { id: employee.erp_hrm_role_id },
      select: {
        rolePermissions: {
          select: {
            permission: true,
          },
        },
      },
    });
  const hasProjectManage = roleWithPermissions.rolePermissions.some(
    (rp) => rp.permission === "project:manage",
  );
  // Check if user is a member/project_lead of the project
  const requestingMembership =
    await MyGlobal.prisma.erp_hrm_project_members.findFirst({
      where: {
        erp_hrm_project_id: props.projectId,
        erp_hrm_employee_id: employee.id,
      },
      select: { id: true },
    });
  // If no project:manage permission and not a project member, return 403
  if (!hasProjectManage && !requestingMembership) {
    throw new HttpException("Forbidden", 403);
  }
  // Get the project member by memberId
  const projectMember =
    await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
      where: { id: props.memberId },
      ...ErpHrmProjectMemberAtInvertTransformer.select(),
    });
  return await ErpHrmProjectMemberAtInvertTransformer.transform(projectMember);
}
