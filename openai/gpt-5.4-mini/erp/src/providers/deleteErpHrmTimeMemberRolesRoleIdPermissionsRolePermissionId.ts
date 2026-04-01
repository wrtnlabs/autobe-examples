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

export async function deleteErpHrmTimeMemberRolesRoleIdPermissionsRolePermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  rolePermissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const membership =
    await MyGlobal.prisma.erp_hrm_time_organization_memberships.findFirstOrThrow(
      {
        where: {
          erp_hrm_time_member_id: props.member.id,
          deleted_at: null,
        },
        select: {
          erp_hrm_time_organization_id: true,
        },
      },
    );
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      erp_hrm_time_organization_id: membership.erp_hrm_time_organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
      is_builtin: true,
    },
  });
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    await prisma.erp_hrm_time_role_permissions.findFirstOrThrow({
      where: {
        id: props.rolePermissionId,
        erp_hrm_time_role_id: role.id,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
    await prisma.erp_hrm_time_role_permissions.delete({
      where: {
        id: props.rolePermissionId,
      },
    });
  });
}
