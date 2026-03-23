import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTrackerRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTrackerRole";
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

export async function postHrmTrackerMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string;
  body: IHrmTrackerRole.IAssignPermissionsRequest;
}): Promise<IHrmTrackerRole.IAssignPermissionsResponse> {
  const role = await MyGlobal.prisma.hrm_tracker_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      name: true,
      is_custom: true,
      organization: true,
    },
  });
  if (!role.is_custom) {
    throw new HttpException("Built-in roles cannot be modified", 400);
  }
  const organizationId = role.organization.id;
  const membership = await MyGlobal.prisma.hrm_tracker_members.findFirstOrThrow(
    {
      where: {
        id: props.member.id,
      },
    },
  );
  const permissions = await MyGlobal.prisma.hrm_tracker_permissions.createMany({
    data: props.body.permissions.map((code) => ({
      id: v4(),
      permission: code,
      hrm_tracker_role_id: props.roleId,
      created_at: new Date(),
      updated_at: new Date(),
    })),
    skipDuplicates: true,
  });
  const assigned = await MyGlobal.prisma.hrm_tracker_permissions.findMany({
    where: { hrm_tracker_role_id: props.roleId },
    select: { permission: true },
  });
  return {
    assigned_count: assigned.length,
  } satisfies IHrmTrackerRole.IAssignPermissionsResponse;
}
