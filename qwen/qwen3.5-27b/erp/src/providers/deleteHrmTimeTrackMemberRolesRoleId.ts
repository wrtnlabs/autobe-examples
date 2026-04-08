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

export async function deleteHrmTimeTrackMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
}): Promise<void> {
  // 1. Find the role by ID (throws 404 if not found)
  const role = await MyGlobal.prisma.hrm_time_track_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      hrm_time_track_organization_id: true,
      is_builtin: true,
      deleted_at: true,
    },
  });
  // 2. Check if role is already deleted (idempotent - return 204)
  if (role.deleted_at !== null) {
    return;
  }
  // 3. Check if role is built-in (cannot be deleted)
  if (role.is_builtin === true) {
    throw new HttpException("Built-in roles cannot be deleted", 400);
  }
  // 4. Verify member belongs to the same organization as the role
  const memberEmployee =
    await MyGlobal.prisma.hrm_time_track_employees.findFirst({
      where: {
        hrm_time_track_member_id: props.member.id,
        hrm_time_track_organization_id: role.hrm_time_track_organization_id,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (memberEmployee === null) {
    throw new HttpException("Forbidden", 403);
  }
  // 5. Check if any active employees are assigned to this role
  const employeesWithRole =
    await MyGlobal.prisma.hrm_time_track_employees.findMany({
      where: {
        hrm_time_track_role_id: props.roleId,
        deleted_at: null,
      },
      select: { id: true },
    });
  if (employeesWithRole.length > 0) {
    const employeeIds = employeesWithRole.map((e) => e.id).join(", ");
    throw new HttpException(
      `Cannot delete role: ${employeesWithRole.length} employee(s) are assigned to this role. Affected employee IDs: ${employeeIds}`,
      400,
    );
  }
  // 6. Soft delete the role
  await MyGlobal.prisma.hrm_time_track_roles.update({
    where: { id: props.roleId },
    data: { deleted_at: new Date() },
  });
}
