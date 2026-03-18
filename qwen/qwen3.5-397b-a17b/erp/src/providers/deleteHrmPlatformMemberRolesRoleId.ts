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
  const memberSession =
    await MyGlobal.prisma.hrm_platform_member_sessions.findFirstOrThrow({
      where: {
        id: props.member.session_id,
      },
    });
  const employee =
    await MyGlobal.prisma.hrm_platform_employees.findFirstOrThrow({
      where: {
        member_id: props.member.id,
        deleted_at: null,
      },
    });
  const role = await MyGlobal.prisma.hrm_platform_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      organization_id: employee.organization_id,
      deleted_at: null,
    },
  });
  if (role.built_in === true) {
    throw new HttpException("Built-in roles cannot be deleted", 403);
  }
  const employeeCount = await MyGlobal.prisma.hrm_platform_employees.count({
    where: {
      role_id: props.roleId,
      status: "active",
      deleted_at: null,
    },
  });
  if (employeeCount > 0) {
    throw new HttpException(
      "Employees are assigned to this role. Reassign employees before deletion",
      409,
    );
  }
  await MyGlobal.prisma.hrm_platform_roles.update({
    where: { id: props.roleId },
    data: {
      deleted_at: new Date(),
    },
  });
  await MyGlobal.prisma.hrm_platform_activity_logs.create({
    data: {
      id: v4(),
      member_id: props.member.id,
      organization_id: employee.organization_id,
      action_type: "role.deleted",
      target_entity_type: "role",
      target_entity_id: props.roleId,
      details: `Deleted custom role: ${role.name}`,
      created_at: new Date(),
      updated_at: new Date(),
      deleted_at: null,
    },
  });
}
