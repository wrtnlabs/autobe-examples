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

export async function postHrmTimeTrackMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackRole.IAddPermission;
}): Promise<IHrmTimeTrackRole> {
  // Find the role and verify it exists and is not soft-deleted
  const role = await MyGlobal.prisma.hrm_time_track_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      hrm_time_track_organization_id: true,
      is_builtin: true,
    },
  });
  // Verify member's organization matches role's organization via session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUnique({
      where: {
        id: props.member.session_id,
      },
      select: {
        hrm_time_track_organization_id: true,
      },
    });
  if (
    session?.hrm_time_track_organization_id !==
    role.hrm_time_track_organization_id
  ) {
    throw new HttpException("Forbidden", 403);
  }
  // Built-in roles cannot have their permissions modified
  if (role.is_builtin) {
    throw new HttpException("Cannot modify built-in role permissions", 400);
  }
  // Insert new permissions, duplicates are ignored due to unique constraint
  await MyGlobal.prisma.hrm_time_track_role_permissions.createMany({
    data: props.body.permissions.map((permission) => ({
      id: v4(),
      hrm_time_track_role_id: props.roleId,
      permission: permission,
      created_at: new Date(),
    })),
    skipDuplicates: true,
  });
  // Reload the role with all permissions
  const updatedRole =
    await MyGlobal.prisma.hrm_time_track_roles.findUniqueOrThrow({
      where: { id: props.roleId },
      ...HrmTimeTrackRoleTransformer.select(),
    });
  return await HrmTimeTrackRoleTransformer.transform(updatedRole);
}
