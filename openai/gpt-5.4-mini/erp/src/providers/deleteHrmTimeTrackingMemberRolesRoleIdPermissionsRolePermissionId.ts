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

export async function deleteHrmTimeTrackingMemberRolesRoleIdPermissionsRolePermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  rolePermissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  const employee =
    await MyGlobal.prisma.hrm_time_tracking_employees.findFirstOrThrow({
      where: {
        user_account_id: props.member.id,
        deleted_at: null,
      },
      select: {
        organization_id: true,
        role_id: true,
      },
    });
  const callerRole =
    await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
      where: {
        id: employee.role_id,
        organization_id: employee.organization_id,
        deleted_at: null,
        OR: [{ code: "Owner" }, { name: "Owner" }],
      },
      select: {
        id: true,
      },
    });
  if (callerRole.id !== employee.role_id) {
    throw new HttpException("Forbidden", 403);
  }
  await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      organization_id: employee.organization_id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const rolePermission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirstOrThrow({
      where: {
        id: props.rolePermissionId,
        hrm_time_tracking_role_id: props.roleId,
        deleted_at: null,
      },
      select: {
        id: true,
      },
    });
  await MyGlobal.prisma.hrm_time_tracking_role_permissions.delete({
    where: {
      id: rolePermission.id,
    },
  });
}
