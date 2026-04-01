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

export async function deleteHrmPlatformMemberRolesRoleIdPermissionsPermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  permissionId: string;
}): Promise<void> {
  const VALID_PERMISSIONS = [
    "org:manage",
    "employee:manage",
    "employee:view",
    "project:manage",
    "project:view",
    "time:manage",
    "time:approve",
    "time:view_all",
    "report:view",
  ] as const;
  if (
    !VALID_PERMISSIONS.includes(
      props.permissionId as (typeof VALID_PERMISSIONS)[number],
    )
  ) {
    throw new HttpException("Invalid permission code", 400);
  }
  const role = await MyGlobal.prisma.hrm_platform_roles.findUnique({
    where: { id: props.roleId },
  });
  if (!role || role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  if (role.is_builtin) {
    throw new HttpException(
      "Cannot remove permissions from built-in roles",
      403,
    );
  }
  const employee = await MyGlobal.prisma.hrm_platform_employees.findFirst({
    where: {
      user_id: props.member.id,
      deleted_at: null,
    },
    select: {
      role_id: true,
      organization_id: true,
    },
  });
  if (!employee) {
    throw new HttpException("Employee record not found", 404);
  }
  if (employee.organization_id !== role.organization_id) {
    throw new HttpException("Forbidden", 403);
  }
  const employeeRolePermissions =
    await MyGlobal.prisma.hrm_platform_role_permissions.findMany({
      where: {
        hrm_platform_role_id: employee.role_id,
        deleted_at: null,
      },
      select: {
        permission: true,
      },
    });
  const hasOrgManage = employeeRolePermissions.some(
    (p) => p.permission === "org:manage",
  );
  if (!hasOrgManage) {
    throw new HttpException("Forbidden: org:manage permission required", 403);
  }
  const permissionAssignment =
    await MyGlobal.prisma.hrm_platform_role_permissions.findFirst({
      where: {
        hrm_platform_role_id: props.roleId,
        permission: props.permissionId,
        deleted_at: null,
      },
    });
  if (!permissionAssignment) {
    throw new HttpException("Permission assignment not found", 404);
  }
  await MyGlobal.prisma.hrm_platform_role_permissions.update({
    where: { id: permissionAssignment.id },
    data: {
      deleted_at: new Date(),
      updated_at: new Date(),
    },
  });
}
