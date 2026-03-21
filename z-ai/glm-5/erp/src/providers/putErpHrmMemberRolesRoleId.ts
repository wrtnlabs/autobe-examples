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
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { ErpHrmRoleTransformer } from "../transformers/ErpHrmRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRole.IUpdate;
}): Promise<IErpHrmRole> {
  // Define valid permission codes
  const validPermissions = new Set([
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
  // Fetch the role with permissions and organization
  const role = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...ErpHrmRoleTransformer.select(),
  });
  // Check if role is deleted
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  // Verify member belongs to the role's organization
  const employee = await MyGlobal.prisma.erp_hrm_employees.findFirst({
    where: {
      erp_hrm_member_id: props.member.id,
      erp_hrm_organization_id: role.organization.id,
      deleted_at: null,
    },
    select: { id: true },
  });
  if (employee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // Built-in Owner role: permissions are immutable
  if (
    role.is_builtin &&
    role.name === "Owner" &&
    props.body.permissions !== undefined
  ) {
    throw new HttpException("Owner role permissions cannot be modified", 403);
  }
  // Validate permission codes if provided
  if (props.body.permissions !== undefined) {
    for (const perm of props.body.permissions) {
      if (!validPermissions.has(perm)) {
        throw new HttpException(`Invalid permission code: ${perm}`, 400);
      }
    }
  }
  // Validate name uniqueness if name is being changed
  if (props.body.name !== undefined && props.body.name !== role.name) {
    const existingRole = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        organization_id: role.organization.id,
        name: props.body.name,
        deleted_at: null,
        id: { not: props.roleId },
      },
    });
    if (existingRole !== null) {
      throw new HttpException(
        "Role name already exists in this organization",
        409,
      );
    }
  }
  // Update within transaction for atomicity
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update name and timestamp
    await tx.erp_hrm_roles.update({
      where: { id: props.roleId },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        updated_at: new Date(),
      },
    });
    // Replace permissions if provided
    if (props.body.permissions !== undefined) {
      // Delete existing permissions
      await tx.erp_hrm_role_permissions.deleteMany({
        where: { erp_hrm_role_id: props.roleId },
      });
      // Insert new permissions
      if (props.body.permissions.length > 0) {
        await tx.erp_hrm_role_permissions.createMany({
          data: props.body.permissions.map((permission) => ({
            id: v4(),
            erp_hrm_role_id: props.roleId,
            permission,
            created_at: new Date(),
          })),
        });
      }
    }
  });
  // Fetch and return updated role
  const updated = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...ErpHrmRoleTransformer.select(),
  });
  return ErpHrmRoleTransformer.transform(updated);
}
