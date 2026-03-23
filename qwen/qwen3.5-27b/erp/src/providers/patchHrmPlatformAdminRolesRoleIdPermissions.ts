import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformMember";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformOrganizationLogo } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationLogo";
import { IHrmPlatformOrganizationSetting } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganizationSetting";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformAdminRolesRoleIdPermissions(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRolePermission.IUpdate;
}): Promise<IHrmPlatformRole> {
  // Find the role and verify it exists
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_platform_organization_id: true,
      is_builtin: true,
    },
  });
  // Verify the role is not a built-in role
  if (role.is_builtin === true) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  const organizationId = role.hrm_platform_organization_id;
  // Begin transaction for permission update
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Soft delete all existing permissions for this role
    await tx.hrm_platform_role_permissions.updateMany({
      where: {
        hrm_platform_role_id: props.roleId,
        deleted_at: null,
      },
      data: {
        deleted_at: new Date(),
      },
    });
    // Create new permission records for each permission code
    for (const permissionCode of props.body.permission_codes) {
      await tx.hrm_platform_role_permissions.create({
        data: {
          id: v4() as string & tags.Format<"uuid">,
          hrm_platform_role_id: props.roleId,
          permission_code: permissionCode,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        },
      });
    }
    // Update the role's updated_at timestamp
    await tx.hrm_platform_roles.update({
      where: { id: props.roleId },
      data: {
        updated_at: new Date(),
      },
    });
    // Create activity log entry
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4() as string & tags.Format<"uuid">,
        hrm_platform_organization_id: organizationId,
        hrm_platform_member_id: null,
        action_type: "role_permissions_updated",
        target_entity_type: "role",
        target_entity_id: props.roleId,
        action_description: `Updated permissions for role ${props.roleId}`,
        ip_address: null,
        user_agent: null,
        created_at: new Date(),
      },
    });
  });
  // Fetch and return the updated role with new permissions
  const updatedRole =
    await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmPlatformRoleTransformer.select(),
    });
  return await HrmPlatformRoleTransformer.transform(updatedRole);
}
