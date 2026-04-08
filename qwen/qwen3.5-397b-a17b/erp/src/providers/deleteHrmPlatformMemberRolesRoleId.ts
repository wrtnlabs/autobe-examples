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

export async function deleteHrmPlatformMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  const role = await MyGlobal.prisma.hrm_platform_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: { id: true, organization_id: true, is_built_in: true },
  });
  const membership =
    await MyGlobal.prisma.hrm_platform_organization_memberships.findFirst({
      where: {
        member: { id: props.member.id },
        organization: { id: role.organization_id },
        deleted_at: null,
      },
    });
  if (!membership) {
    throw new HttpException("Forbidden", 403);
  }
  if (role.is_built_in) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  const assigneeCount = await MyGlobal.prisma.hrm_platform_employees.count({
    where: {
      role_id: props.roleId,
      deleted_at: null,
    },
  });
  if (assigneeCount > 0) {
    throw new HttpException(
      "Cannot delete role with active assignees. Reassign employees first.",
      409,
    );
  }
  await MyGlobal.prisma.hrm_platform_roles.update({
    where: { id: props.roleId },
    data: {
      deleted_at: new Date(),
    },
  });
}
