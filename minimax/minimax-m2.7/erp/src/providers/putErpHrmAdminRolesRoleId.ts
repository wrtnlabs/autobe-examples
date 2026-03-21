import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IErpHrmMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmMember";
import { IErpHrmOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmOrganization";
import { IErpHrmRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRole";
import { IErpHrmRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putErpHrmAdminRolesRoleId(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IErpHrmRole.IUpdate;
}): Promise<IErpHrmRole> {
  // Step 1: Fetch the role to verify it exists and get organization context
  const existingRole = await MyGlobal.prisma.erp_hrm_roles.findUnique({
    where: { id: props.roleId },
    select: {
      id: true,
      name: true,
      is_builtin: true,
      erp_hrm_organization_id: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (!existingRole) {
    throw new HttpException("Role not found", 404);
  }
  if (existingRole.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  // Step 2: Built-in role protection - cannot update built-in roles
  if (existingRole.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 400);
  }
  // Step 3: Validate new name uniqueness within the organization (if name is being changed)
  if (props.body.name !== undefined) {
    const duplicateName = await MyGlobal.prisma.erp_hrm_roles.findFirst({
      where: {
        erp_hrm_organization_id: existingRole.erp_hrm_organization_id,
        name: props.body.name,
        deleted_at: null,
        id: { not: props.roleId },
      },
      select: { id: true },
    });
    if (duplicateName) {
      throw new HttpException(
        "Role name already exists in this organization",
        400,
      );
    }
  }
  // Step 4: Validate permission codes (if provided)
  const validPermissions = [
    "org:manage",
    "employee:manage",
    "project:manage",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
    "project:view",
  ];
  if (props.body.permission_codes !== undefined) {
    const invalidPermissions = props.body.permission_codes.filter(
      (code) => !validPermissions.includes(code),
    );
    if (invalidPermissions.length > 0) {
      throw new HttpException(
        `Invalid permission codes: ${invalidPermissions.join(", ")}`,
        400,
      );
    }
  }
  // Step 5: Execute transaction to update role and permissions
  const now = new Date();
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Update role name (if provided) and updated_at timestamp
    const updateData: Prisma.erp_hrm_rolesUpdateInput = {
      updated_at: now,
    };
    if (props.body.name !== undefined) {
      updateData.name = props.body.name;
    }
    await tx.erp_hrm_roles.update({
      where: { id: props.roleId },
      data: updateData,
    });
    // Delete all existing role permissions for this role
    await tx.erp_hrm_role_permissions.deleteMany({
      where: { erp_hrm_role_id: props.roleId },
    });
    // Insert new role permissions (if provided)
    if (props.body.permission_codes && props.body.permission_codes.length > 0) {
      const permissionEntries = props.body.permission_codes.map(
        (permission) => ({
          id: v4() as string & tags.Format<"uuid">,
          erp_hrm_role_id: props.roleId,
          permission: permission,
          created_at: now,
          updated_at: now,
        }),
      );
      await tx.erp_hrm_role_permissions.createMany({
        data: permissionEntries,
      });
    }
  });
  // Step 6: Fetch the complete updated role with all relations
  const updatedRole = await MyGlobal.prisma.erp_hrm_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      name: true,
      is_builtin: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
      organization: {
        select: {
          id: true,
          name: true,
          description: true,
          logo_uri: true,
          currency: true,
          timezone: true,
          fiscal_start_month: true,
          created_at: true,
          updated_at: true,
          owner: {
            select: {
              id: true,
              email: true,
              display_name: true,
              avatar_uri: true,
              phone: true,
              created_at: true,
            },
          },
        },
      },
      rolePermissions: {
        select: {
          id: true,
          permission: true,
          created_at: true,
          updated_at: true,
          role: {
            select: {
              id: true,
              name: true,
              is_builtin: true,
              created_at: true,
              organization: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  logo_uri: true,
                  currency: true,
                  timezone: true,
                  fiscal_start_month: true,
                  created_at: true,
                  updated_at: true,
                  owner: {
                    select: {
                      id: true,
                      email: true,
                      display_name: true,
                      avatar_uri: true,
                      phone: true,
                      created_at: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
      _count: {
        select: {
          rolePermissions: true,
          employees: true,
          invitations: true,
        },
      },
    },
  });
  // Step 7: Transform and return the response
  const organizationOwner = {
    id: updatedRole.organization.owner.id,
    email: updatedRole.organization.owner.email,
    displayName: updatedRole.organization.owner.display_name,
    avatarUri: updatedRole.organization.owner.avatar_uri ?? undefined,
    phone: updatedRole.organization.owner.phone ?? undefined,
    createdAt: toISOStringSafe(updatedRole.organization.owner.created_at),
  };
  const organizationSummary = {
    id: updatedRole.organization.id,
    name: updatedRole.organization.name,
    description: updatedRole.organization.description ?? undefined,
    logoUri: updatedRole.organization.logo_uri ?? undefined,
    currency: updatedRole.organization.currency,
    timezone: updatedRole.organization.timezone,
    fiscalStartMonth: updatedRole.organization.fiscal_start_month,
    createdAt: toISOStringSafe(updatedRole.organization.created_at),
    owner: organizationOwner,
  };
  const rolePermissionSummaries = updatedRole.rolePermissions.map((rp) => {
    const rpOwner = {
      id: rp.role.organization.owner.id,
      email: rp.role.organization.owner.email,
      displayName: rp.role.organization.owner.display_name,
      avatarUri: rp.role.organization.owner.avatar_uri ?? undefined,
      phone: rp.role.organization.owner.phone ?? undefined,
      createdAt: toISOStringSafe(rp.role.organization.owner.created_at),
    };
    const rpOrganization = {
      id: rp.role.organization.id,
      name: rp.role.organization.name,
      description: rp.role.organization.description ?? undefined,
      logoUri: rp.role.organization.logo_uri ?? undefined,
      currency: rp.role.organization.currency,
      timezone: rp.role.organization.timezone,
      fiscalStartMonth: rp.role.organization.fiscal_start_month,
      createdAt: toISOStringSafe(rp.role.organization.created_at),
      owner: rpOwner,
    };
    const rpRole = {
      id: rp.role.id,
      name: rp.role.name,
      is_builtin: rp.role.is_builtin,
      created_at: toISOStringSafe(rp.role.created_at),
      organization: rpOrganization,
    };
    return {
      id: rp.id,
      permission: rp.permission,
      role: rpRole,
    };
  });
  return {
    id: updatedRole.id,
    name: updatedRole.name,
    is_builtin: updatedRole.is_builtin,
    created_at: toISOStringSafe(updatedRole.created_at),
    updated_at: toISOStringSafe(updatedRole.updated_at),
    deleted_at:
      updatedRole.deleted_at !== null
        ? toISOStringSafe(updatedRole.deleted_at)
        : null,
    organization: organizationSummary,
    rolePermissions: rolePermissionSummaries,
    permissions_count: updatedRole._count.rolePermissions,
    employees_count: updatedRole._count.employees,
    invitations_count: updatedRole._count.invitations,
  } satisfies IErpHrmRole;
}
