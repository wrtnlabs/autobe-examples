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

export async function putErpHrmMemberOrganizationsOrganizationIdRolesRoleId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRole.IUpdate;
}): Promise<IErpHrmRole> {
  // 1. Verify the member belongs to this organization and has org:manage permission
  const orgMember =
    await MyGlobal.prisma.erp_hrm_organization_members.findFirst({
      where: {
        member_id: props.member.id,
        organization_id: props.organizationId,
        deleted_at: null,
      },
      select: {
        id: true,
        role_id: true,
      },
    });
  if (orgMember === null) {
    throw new HttpException("You are not a member of this organization", 403);
  }
  // Fetch permissions for the member's role
  const memberRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: { id: orgMember.role_id },
    select: {
      permissions: {
        select: { permission_code: true },
      },
    },
  });
  const hasOrgManage =
    memberRole !== null &&
    memberRole.permissions.some(
      (p: { permission_code: string }) => p.permission_code === "org:manage",
    );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden: requires org:manage permission", 403);
  }
  // 2. Find the target role scoped to the organization
  const existingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
    where: {
      id: props.roleId,
      erp_hrm_organization_id: props.organizationId,
    },
    select: { id: true, is_builtin: true, name: true },
  });
  if (existingRole === null) {
    throw new HttpException("Role not found", 404);
  }
  // 3. Reject built-in roles
  if (existingRole.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 422);
  }
  // 4. Check name uniqueness within the organization (exclude current role)
  if (existingRole.name !== props.body.name) {
    const nameConflict = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        erp_hrm_organization_id: props.organizationId,
        name: props.body.name,
        id: { not: props.roleId },
      },
      select: { id: true },
    });
    if (nameConflict !== null) {
      throw new HttpException(
        "A role with this name already exists in the organization",
        409,
      );
    }
  }
  // 5. Execute update + permission replacement in a single transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // a. Update role name and updated_at
    await tx.erp_hrm_roles.update({
      where: { id: props.roleId },
      data: {
        name: props.body.name,
        updated_at: new Date(),
      },
    });
    // b. Delete all existing permissions
    await tx.erp_hrm_role_permissions.deleteMany({
      where: { role_id: props.roleId },
    });
    // c. Insert new permissions
    if (props.body.permissionCodes.length > 0) {
      await tx.erp_hrm_role_permissions.createMany({
        data: props.body.permissionCodes.map((code) => ({
          id: v4(),
          role_id: props.roleId,
          permission_code: code,
          created_at: new Date(),
        })),
      });
    }
  });
  // 6. Fetch updated role and return via transformer
  const updated = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...ErpHrmRoleTransformer.select(),
  });
  return ErpHrmRoleTransformer.transform(updated);
}
