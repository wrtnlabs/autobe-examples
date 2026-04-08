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

export async function putHrmTimeTrackMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackRole.IUpdate;
}): Promise<IHrmTimeTrackRole> {
  // Get organization context from member's session
  const session =
    await MyGlobal.prisma.hrm_time_track_member_sessions.findUniqueOrThrow({
      where: { id: props.member.session_id },
      select: { hrm_time_track_organization_id: true },
    });
  const organizationId = session.hrm_time_track_organization_id;
  // Find the role and verify it belongs to the organization and is not soft-deleted
  const role = await MyGlobal.prisma.hrm_time_track_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
      hrm_time_track_organization_id: organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      is_builtin: true,
      name: true,
    },
  });
  // Validate built-in role protection: cannot modify name
  if (role.is_builtin && props.body.name !== undefined) {
    throw new HttpException("Cannot modify built-in role name", 403);
  }
  // Check name uniqueness for custom roles when name is being updated
  if (props.body.name !== undefined && !role.is_builtin) {
    const existing = await MyGlobal.prisma.hrm_time_track_roles.findFirst({
      where: {
        hrm_time_track_organization_id: organizationId,
        name: props.body.name,
        deleted_at: null,
        id: { not: props.roleId },
      },
    });
    if (existing) {
      throw new HttpException("Role name already exists", 409);
    }
  }
  // Update the role with allowed fields
  const updateData: Prisma.hrm_time_track_rolesUpdateInput = {
    updated_at: new Date(),
    ...(props.body.name !== undefined && { name: props.body.name }),
    ...(props.body.description !== undefined && {
      description: props.body.description,
    }),
  };
  await MyGlobal.prisma.hrm_time_track_roles.update({
    where: { id: props.roleId },
    data: updateData,
  });
  // Fetch the updated role with permissions
  const updated = await MyGlobal.prisma.hrm_time_track_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    ...HrmTimeTrackRoleTransformer.select(),
  });
  return await HrmTimeTrackRoleTransformer.transform(updated);
}
