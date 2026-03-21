import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmDepartment";
import { IErpHrmEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmEmployee";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
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
  // First, get the project to know its organization
  const project = await MyGlobal.prisma.erp_hrm_projects.findUniqueOrThrow({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  // Get employee record for this member in the project's organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirstOrThrow({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: project.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_role_id: true,
    },
  });
  // Check for project:manage permission
  const permission = await MyGlobal.prisma.erp_hrm_role_permissions.findFirst({
    where: {
      erp_hrm_role_id: employee.erp_hrm_role_id,
      permission: "project:manage",
    },
  });
  if (permission === null) {
    throw new HttpException(
      "Forbidden - project:manage permission required",
      403,
    );
  }
  // Verify project member exists and belongs to the project
  const projectMember =
    await MyGlobal.prisma.erp_hrm_project_members.findUniqueOrThrow({
      where: {
        id: props.projectMemberId,
        deleted_at: null,
      },
      select: {
        id: true,
        erp_hrm_project_id: true,
      },
    });
  if (projectMember.erp_hrm_project_id !== props.projectId) {
    throw new HttpException(
      "Project member does not belong to this project",
      400,
    );
  }
  // Update the project member role
  const updated = await MyGlobal.prisma.erp_hrm_project_members.update({
    where: {
      id: props.projectMemberId,
    },
    data: {
      ...(props.body.role !== undefined && { role: props.body.role }),
      updated_at: new Date(),
    },
    ...ErpHrmProjectMemberTransformer.select(),
  });
  return ErpHrmProjectMemberTransformer.transform(updated);
}
