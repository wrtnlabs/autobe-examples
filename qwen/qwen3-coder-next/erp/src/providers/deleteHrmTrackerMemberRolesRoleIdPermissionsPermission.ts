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

export async function deleteHrmTrackerMemberRolesRoleIdPermissionsPermission(props: {
  member: MemberPayload;
  roleId: string;
  permission: string;
}): Promise<void> {
  // Find the role and verify ownership
  const role = await MyGlobal.prisma.hrm_tracker_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_tracker_organization_id: true,
      is_custom: true,
    },
  });
  // Verify role is custom (built-in roles are immutable)
  if (!role.is_custom) {
    throw new HttpException(
      "Built-in roles cannot have permissions modified",
      400,
    );
  }
  // Verify organization ownership
  const organization =
    await MyGlobal.prisma.hrm_tracker_organizations.findFirstOrThrow({
      where: {
        id: role.hrm_tracker_organization_id,
        owner_member_id: props.member.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  // Find the permission assignment
  const rolePermission =
    await MyGlobal.prisma.hrm_tracker_role_permissions.findFirstOrThrow({
      where: {
        role_id: props.roleId,
        permission_id: props.permission,
      },
      select: {
        id: true,
      },
    });
  // Delete the permission assignment
  await MyGlobal.prisma.hrm_tracker_role_permissions.delete({
    where: {
      id: rolePermission.id,
    },
  });
}
