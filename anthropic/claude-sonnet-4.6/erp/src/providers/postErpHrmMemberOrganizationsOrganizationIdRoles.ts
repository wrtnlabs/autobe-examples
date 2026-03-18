import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
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

export async function postErpHrmMemberOrganizationsOrganizationIdRoles(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  body: IErpHrmRole.ICreate;
}): Promise<IErpHrmRole> {
  const VALID_PERMISSION_CODES = new Set([
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ]);
  // Step 1: Verify member belongs to the organization
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        organization_id: props.organizationId,
        member_id: props.member.id,
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
  if (orgMember === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 2: Verify org:manage permission
  const hasOrgManage = orgMember.role.permissions.some(
    (p) => p.permission_code === "org:manage",
  );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden", 403);
  }
  // Step 3: Validate permission codes
  for (const code of props.body.permissions) {
    if (!VALID_PERMISSION_CODES.has(code)) {
      throw new HttpException(`Invalid permission code: ${code}`, 422);
    }
  }
  // Step 4: Check name uniqueness within organization
  const existing = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      erp_hrm_organization_id: props.organizationId,
      name: props.body.name,
    },
    select: { id: true },
  });
  if (existing !== null) {
    throw new HttpException(
      "Conflict: role name already exists in this organization",
      409,
    );
  }
  // Step 5: Create role with permissions using Collector + Transformer
  const created = await MyGlobal.prisma.erp_hrm_roles.create({
    data: await ErpHrmRoleCollector.collect({
      body: props.body,
      erpHrmOrganizations: { id: props.organizationId },
      erpHrmMembers: { id: props.member.id },
      erpHrmMemberSessions: { id: props.member.session_id },
    }),
    ...ErpHrmRoleTransformer.select(),
  });
  // Step 6: Transform and return
  return ErpHrmRoleTransformer.transform(created);
}
