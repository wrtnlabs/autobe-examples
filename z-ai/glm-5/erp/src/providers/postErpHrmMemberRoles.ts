import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { ErpHrmRoleCollector } from "../collectors/ErpHrmRoleCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberRoles(props: {
  member: MemberPayload;
  body: IErpHrmRole.ICreate;
}): Promise<IErpHrmRole> {
  // Get member's current organization from session
  const session =
    await MyGlobal.prisma.erp_hrm_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: {
        erp_hrm_organization_id: true,
        organization: { select: { id: true } },
      },
    });
  if (!session.erp_hrm_organization_id || !session.organization) {
    throw new HttpException("No organization context selected", 400);
  }
  // Get employee with role and permissions to check authorization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: session.erp_hrm_organization_id,
      deleted_at: null,
    },
    select: {
      role: {
        select: {
          name: true,
          is_builtin: true,
          permissions: { select: { permission: true } },
        },
      },
    },
  });
  if (!employee) {
    throw new HttpException("Employee not found in organization", 403);
  }
  // Check org:manage permission (Owner role has all permissions)
  const isOwner = employee.role.name === "Owner";
  const hasOrgManage = employee.role.permissions.some(
    (p) => p.permission === "org:manage",
  );
  if (!isOwner && !hasOrgManage) {
    throw new HttpException("Forbidden - org:manage permission required", 403);
  }
  // Check role name uniqueness within organization
  const existingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      organization_id: session.erp_hrm_organization_id,
      name: props.body.name,
      deleted_at: null,
    },
  });
  if (existingRole) {
    throw new HttpException("Role name already exists in organization", 409);
  }
  // Create role using collector
  const created = await MyGlobal.prisma.erp_hrm_roles.create({
    data: await ErpHrmRoleCollector.collect({
      body: props.body,
      organization: session.organization,
    }),
    ...ErpHrmRoleTransformer.select(),
  });
  return await ErpHrmRoleTransformer.transform(created);
}
