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
import { HrmPlatformRolePermissionCollector } from "../collectors/HrmPlatformRolePermissionCollector";
import { AdminPayload } from "../decorators/payload/AdminPayload";
import { HrmPlatformRolePermissionTransformer } from "../transformers/HrmPlatformRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmPlatformAdminRolesRoleIdPermissions(props: {
  admin: AdminPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRolePermission.ICreate;
}): Promise<IHrmPlatformRolePermission> {
  // Retrieve the role to verify it exists and get organization context
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      is_builtin: true,
      hrm_platform_organization_id: true,
    },
  });
  // Validate that the role is not a built-in role
  if (role.is_builtin === true) {
    throw new HttpException(
      "Built-in roles cannot have their permissions modified",
      400,
    );
  }
  // Check if permission already exists for this role
  const existingPermission =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: props.roleId,
        permission_code: props.body.permission_code,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  if (existingPermission !== null) {
    throw new HttpException("Permission already assigned to this role", 409);
  }
  // Create the permission record using the Collector
  const created = await MyGlobal.prisma.hrm_platform_role_permissions.create({
    data: await HrmPlatformRolePermissionCollector.collect({
      body: props.body,
      hrmPlatformRoles: { id: props.roleId },
    }),
    ...HrmPlatformRolePermissionTransformer.select(),
  });
  // Record activity log for the permission addition
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      action_type: "role_permission_added",
      target_entity_type: "role",
      target_entity_id: props.roleId,
      action_description: `Permission ${props.body.permission_code} added to role`,
      hrm_platform_organization_id: role.hrm_platform_organization_id,
      hrm_platform_member_id: null,
      created_at: new Date(),
    },
  });
  // Transform and return the created permission
  return await HrmPlatformRolePermissionTransformer.transform(created);
}
