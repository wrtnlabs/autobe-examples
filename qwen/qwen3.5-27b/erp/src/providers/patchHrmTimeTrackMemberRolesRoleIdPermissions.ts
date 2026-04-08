import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackRole";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackRoleTransformer } from "../transformers/HrmTimeTrackRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackRole.IUpdatePermission;
}): Promise<IHrmTimeTrackRole> {
  // Find the role and verify it exists
  const role = await MyGlobal.prisma.hrm_time_track_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
    },
    select: {
      id: true,
      is_builtin: true,
      deleted_at: true,
    },
  });
  // Check if role is soft-deleted
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  // Check if role is built-in (cannot modify permissions)
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 400);
  }
  // Perform the permission update in a transaction
  await MyGlobal.prisma.$transaction([
    // Delete all existing permissions for this role
    MyGlobal.prisma.hrm_time_track_role_permissions.deleteMany({
      where: {
        hrm_time_track_role_id: props.roleId,
      },
    }),
    // Insert new permissions
    ...props.body.permissions.map((permission) =>
      MyGlobal.prisma.hrm_time_track_role_permissions.create({
        data: {
          id: v4(),
          role: { connect: { id: props.roleId } },
          permission: permission,
          created_at: new Date(),
        },
      }),
    ),
    // Update the role's updated_at timestamp
    MyGlobal.prisma.hrm_time_track_roles.update({
      where: {
        id: props.roleId,
      },
      data: {
        updated_at: new Date(),
      },
    }),
  ]);
  // Return the updated role with new permissions
  const record = await MyGlobal.prisma.hrm_time_track_roles.findFirstOrThrow({
    ...HrmTimeTrackRoleTransformer.select(),
    where: {
      id: props.roleId,
    },
  });
  return await HrmTimeTrackRoleTransformer.transform(record);
}
