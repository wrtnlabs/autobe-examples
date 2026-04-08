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
  const role = await MyGlobal.prisma.erp_hrm_time_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_organization_id: true,
      is_builtin: true,
    },
  });
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  await MyGlobal.prisma.erp_hrm_time_role_permissions.findFirstOrThrow({
    where: {
      id: props.rolePermissionId,
      erp_hrm_time_role_id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      erp_hrm_time_role_id: true,
    },
  });
  await MyGlobal.prisma.erp_hrm_time_role_permissions.delete({
    where: {
      id: props.rolePermissionId,
    },
  });
}
