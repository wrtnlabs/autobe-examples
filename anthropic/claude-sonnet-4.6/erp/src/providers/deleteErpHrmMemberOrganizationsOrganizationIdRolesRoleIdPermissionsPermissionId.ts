import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteErpHrmMemberOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // Step 1: Find caller's org membership and their assigned role
  const callerMembership =
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
            is_builtin: true,
            name: true,
          },
        },
      },
    });
  if (callerMembership === null) {
    throw new HttpException("Not a member of this organization", 403);
  }
  // Step 2: Only the Owner role can manage custom roles
  if (
    !callerMembership.role.is_builtin ||
    callerMembership.role.name !== "Owner"
  ) {
    throw new HttpException(
      "Only organization owners can manage role permissions",
      403,
    );
  }
  // Step 3: Validate organization exists and is not deleted
  await MyGlobal.prisma.erp_hrm_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: { id: true },
  });
  // Step 4: Validate target role exists in this organization
  const targetRole = await MyGlobal.prisma.erp_hrm_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      erp_hrm_organization_id: props.organizationId,
    },
    select: {
      id: true,
      name: true,
      is_builtin: true,
    },
  });
  // Step 5: Reject modification of built-in roles
  if (targetRole.is_builtin) {
    throw new HttpException(
      "Built-in role permissions cannot be modified",
      422,
    );
  }
  // Step 6: Validate the permission entry exists and belongs to this role
  const permissionEntry =
    await MyGlobal.prisma.erp_hrm_role_permissions.findFirstOrThrow({
      where: {
        id: props.permissionId,
        role_id: props.roleId,
      },
      select: {
        id: true,
        permission_code: true,
      },
    });
  // Step 7: Hard delete the permission entry
  await MyGlobal.prisma.erp_hrm_role_permissions.delete({
    where: { id: props.permissionId },
  });
  // Step 8: Insert activity log entry
  await MyGlobal.prisma.erp_hrm_activity_logs.create({
    data: {
      id: v4(),
      organization_id: props.organizationId,
      organization_member_id: callerMembership.id,
      action_type: "role_assigned_or_changed",
      target_entity_type: "role",
      target_entity_id: props.roleId,
      details: `Removed permission '${permissionEntry.permission_code}' from role '${targetRole.name}'`,
      created_at: new Date(),
    },
  });
}
