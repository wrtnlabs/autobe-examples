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
  // 1. Resolve the target project first (to get organization context)
  const project = await MyGlobal.prisma.erp_hrm_projects.findFirst({
    where: {
      id: props.projectId,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
    },
  });
  if (project === null) {
    throw new HttpException("Project not found", 404);
  }
  // 2. Resolve caller's organization member record within the project's org
  const callerMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        organization_id: true,
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
  if (callerMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Permission check: must have project:manage
  const hasProjectManage = callerMember.role.permissions.some(
    (p) => p.permission_code === "project:manage",
  );
  if (!hasProjectManage) {
    throw new HttpException(
      "Forbidden: project:manage permission required",
      403,
    );
  }
  // 4. Validate target organization member
  const targetMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        id: props.body.organizationMemberId,
        organization_id: project.organization_id,
        deleted_at: null,
      },
      select: {
        id: true,
        status: true,
      },
    });
  if (targetMember === null) {
    throw new HttpException("Organization member not found", 404);
  }
  if (targetMember.status !== "active") {
    throw new HttpException(
      "Deactivated members cannot be assigned to projects",
      409,
    );
  }
  // 5. Duplicate check: prevent double-assignment
  const existing = await MyGlobal.prisma.erp_hrm_project_members.findFirst({
    where: {
      project_id: project.id,
      organization_member_id: props.body.organizationMemberId,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException("Member is already assigned to this project", 409);
  }
  // 6. Create the project membership and return the full DTO
  const created = await MyGlobal.prisma.erp_hrm_project_members.create({
    data: await ErpHrmProjectMemberCollector.collect({
      body: props.body,
      erpHrmProjects: { id: project.id },
      erpHrmMembers: { id: props.member.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmProjectMemberTransformer.select(),
  });
  return ErpHrmProjectMemberTransformer.transform(created);
}
