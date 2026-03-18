import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmPlatformDepartment } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformDepartment";
import { IHrmPlatformEmployee } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformEmployee";
import { IHrmPlatformOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformOrganization";
import { IHrmPlatformRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRole";
import { IHrmPlatformRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmPlatformRoleTransformer } from "../transformers/HrmPlatformRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmPlatformMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmPlatformRole.IUpdatePermission;
}): Promise<IHrmPlatformRole> {
  const VALID_PERMISSIONS = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  // Fetch the role and verify it exists
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      organization_id: true,
      built_in: true,
      name: true,
    },
  });
  // Get member's employee record to verify organization access
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      member_id: props.member.id,
      organization_id: role.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      organization_id: true,
      role_id: true,
    },
  });
  // Verify member has access to this organization
  if (!employee) {
    throw new HttpException("You do not have access to this organization", 403);
  }
  // Verify role is not built-in
  if (role.built_in) {
    throw new HttpException(
      "Cannot update permissions for built-in roles",
      403,
    );
  }
  // Validate all permission codes and deduplicate
  const uniquePermissions = [...new Set(props.body.permissions)];
  for (const permission of uniquePermissions) {
    if (
      !VALID_PERMISSIONS.includes(
        permission as (typeof VALID_PERMISSIONS)[number],
      )
    ) {
      throw new HttpException(
        `Invalid permission code: ${permission}. Valid codes: ${VALID_PERMISSIONS.join(", ")}`,
        400,
      );
    }
  }
  // Perform permission update in transaction
  await MyGlobal.prisma.$transaction(async (tx) => {
    // Delete existing permissions
    await tx.hrm_platform_role_permissions.deleteMany({
      where: {
        role_id: props.roleId,
        deleted_at: null,
      },
    });
    // Insert new permissions
    if (uniquePermissions.length > 0) {
      await tx.hrm_platform_role_permissions.createMany({
        data: uniquePermissions.map((permission) => ({
          id: v4(),
          role_id: props.roleId,
          permission,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
      });
    }
    // Log the action to activity logs
    await tx.hrm_platform_activity_logs.create({
      data: {
        id: v4(),
        member_id: props.member.id,
        organization_id: role.organization_id,
        action_type: "role.permissions.updated",
        target_entity_type: "role",
        target_entity_id: props.roleId,
        details: JSON.stringify({
          role_id: props.roleId,
          role_name: role.name,
          permissions: uniquePermissions,
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    });
  });
  // Fetch and return updated role using transformer
  const updatedRole =
    await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmPlatformRoleTransformer.select(),
    });
  return await HrmPlatformRoleTransformer.transform(updatedRole);
}
