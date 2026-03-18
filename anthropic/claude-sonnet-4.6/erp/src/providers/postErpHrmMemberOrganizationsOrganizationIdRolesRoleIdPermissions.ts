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
import { ErpHrmRolePermissionCollector } from "../collectors/ErpHrmRolePermissionCollector";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRolePermissionTransformer } from "../transformers/ErpHrmRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissions(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRolePermission.ICreate;
}): Promise<IErpHrmRolePermission> {
  return MyGlobal.prisma.$transaction(async (tx) => {
    // 1. Find the caller's organization membership and verify Owner role
    const callerMembership = await tx.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: props.organizationId,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
    if (callerMembership === null) {
      throw new HttpException(
        "Forbidden: not a member of this organization",
        403,
      );
    }
    // Fetch caller's role to check if Owner
    const callerRole = await tx.erp_hrm_roles.findFirst({
      where: {
        id: callerMembership.role_id,
      },
      select: {
        id: true,
        name: true,
        is_builtin: true,
      },
    });
    if (
      callerRole === null ||
      !callerRole.is_builtin ||
      callerRole.name !== "Owner"
    ) {
      throw new HttpException(
        "Forbidden: only organization Owners may manage role permissions",
        403,
      );
    }
    // 2. Look up the target role scoped to the organization
    const targetRole = await tx.erp_hrm_roles.findFirst({
      where: {
        id: props.roleId,
        organization: { id: props.organizationId },
      },
      select: {
        id: true,
        is_builtin: true,
      },
    });
    if (targetRole === null) {
      throw new HttpException(
        "Not Found: role not found in this organization",
        404,
      );
    }
    // 3. Reject modification of built-in roles
    if (targetRole.is_builtin) {
      throw new HttpException(
        "Unprocessable Entity: built-in role permissions cannot be modified",
        422,
      );
    }
    // 4. Check for duplicate permission grant
    const existing = await tx.erp_hrm_role_permissions.findUnique({
      where: {
        role_id_permission_code: {
          role_id: props.roleId,
          permission_code: props.body.permission_code,
        },
      },
      select: { id: true },
    });
    if (existing !== null) {
      throw new HttpException(
        "Conflict: this permission code is already granted to the role",
        409,
      );
    }
    // 5. Insert the new permission using the collector
    const created = await tx.erp_hrm_role_permissions.create({
      data: await ErpHrmRolePermissionCollector.collect({
        body: props.body,
        erpHrmRoles: { id: props.roleId },
        erpHrmMembers: { id: props.member.id },
        erpHrmMemberSessions: { id: props.member.session_id },
      }),
      ...ErpHrmRolePermissionTransformer.select(),
    });
    return ErpHrmRolePermissionTransformer.transform(created);
  });
}
