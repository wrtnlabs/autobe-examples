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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissions(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRolePermission.IUpdate;
}): Promise<IErpHrmRole> {
  const ALLOWED_PERMISSION_CODES: string[] = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ];
  // 1. Verify the requesting member belongs to this organization and is active
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        role: {
          select: {
            name: true,
            is_builtin: true,
          },
        },
      },
    });
  if (orgMember === null) {
    throw new HttpException(
      "Forbidden: not a member of this organization",
      403,
    );
  }
  // 2. Verify the member holds the Owner built-in role
  if (!(orgMember.role.is_builtin && orgMember.role.name === "Owner")) {
    throw new HttpException(
      "Forbidden: only organization owners can update role permissions",
      403,
    );
  }
  // 3. Fetch the target role scoped to this organization (404 if not found)
  const targetRole = await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      erp_hrm_organization_id: props.organizationId,
    },
    select: {
      id: true,
      is_builtin: true,
    },
  });
  // 4. Reject attempts to modify built-in role permissions
  if (targetRole.is_builtin) {
    throw new HttpException(
      "Unprocessable Entity: cannot modify permissions of built-in roles",
      422,
    );
  }
  // 5. Validate all provided permission codes against the allowed catalogue
  for (const code of props.body.permissionCodes) {
    if (!ALLOWED_PERMISSION_CODES.includes(code)) {
      throw new HttpException(
        `Bad Request: unrecognized permission code '${code}'`,
        400,
      );
    }
  }
  // 6. Atomically replace the permission set within a transaction
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // 6a. Remove all existing permission rows for this role
    await tx.erp_hrm_role_permissions.deleteMany({
      where: { role_id: props.roleId },
    });
    // 6b. Insert new permission rows (one per code)
    if (props.body.permissionCodes.length > 0) {
      await tx.erp_hrm_role_permissions.createMany({
        data: props.body.permissionCodes.map((code) => ({
          id: v4(),
          role_id: props.roleId,
          permission_code: code,
          created_at: now,
        })),
      });
    }
    // 6c. Bump the role's updated_at timestamp
    await tx.erp_hrm_roles.update({
      where: { id: props.roleId },
      data: { updated_at: now },
    });
  });
  // 7. Record the permission change in the organization's activity log
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      organization_id: props.organizationId,
      organization_member_id: orgMember.id,
      action_type: "role_assigned_or_changed",
      target_entity_type: "role",
      target_entity_id: props.roleId,
      details: `Permission codes updated for role ${props.roleId}`,
      created_at: now,
    },
  });
  // 8. Return the fully updated role (with new permissions)
  const updated = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...ErpHrmRoleTransformer.select(),
  });
  return ErpHrmRoleTransformer.transform(updated);
}
