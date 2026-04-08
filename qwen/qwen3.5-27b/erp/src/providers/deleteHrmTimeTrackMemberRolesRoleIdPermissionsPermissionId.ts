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

export async function deleteHrmTimeTrackMemberRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Verify role exists and get is_builtin flag
  const role = await MyGlobal.prisma.hrm_time_track_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      is_builtin: true,
    },
  });
  // 2. Check if built-in role - reject with 403
  if (role.is_builtin) {
    throw new HttpException("Forbidden", 403);
  }
  // 3. Verify permission assignment exists
  await MyGlobal.prisma.hrm_time_track_role_permissions.findUniqueOrThrow({
    where: {
      id: props.permissionId,
      hrm_time_track_role_id: props.roleId,
    },
  });
  // 4. Delete the permission record
  await MyGlobal.prisma.hrm_time_track_role_permissions.delete({
    where: {
      id: props.permissionId,
    },
  });
}
