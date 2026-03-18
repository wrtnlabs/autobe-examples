import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
import { IHrmTimeTrackingRolePermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRolePermission";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { MemberPayload } from "../decorators/payload/MemberPayload";
import { HrmTimeTrackingRoleTransformer } from "../transformers/HrmTimeTrackingRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRolePermission.ICreate;
}): Promise<IHrmTimeTrackingRole> {
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
    },
    select: {
      id: true,
      organization_id: true,
      is_builtin: true,
    },
  });
  const uniquePermissionIds = [...new Set(props.body.permissionIds)];
  if (uniquePermissionIds.length !== props.body.permissionIds.length) {
    throw new HttpException("Duplicate permissionIds", 400);
  }
  if (role.is_builtin === true) {
    throw new HttpException("Builtin roles cannot be modified", 400);
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const existing = await prisma.hrm_time_tracking_role_permissions.findMany({
      where: {
        hrm_time_tracking_role_id: role.id,
      },
      select: {
        id: true,
        permission_id: true,
      },
    });
    const existingPermissionIds = new Set<string>(
      existing.map((row) => row.permission_id),
    );
    const desiredPermissionIds = new Set<string>(uniquePermissionIds);
    const staleIds = existing
      .filter((row) => !desiredPermissionIds.has(row.permission_id))
      .map((row) => row.id);
    if (staleIds.length > 0) {
      await prisma.hrm_time_tracking_role_permissions.deleteMany({
        where: {
          id: { in: staleIds },
        },
      });
    }
    const missingPermissionIds = uniquePermissionIds.filter(
      (permissionId) => !existingPermissionIds.has(permissionId),
    );
    if (missingPermissionIds.length > 0) {
      await prisma.hrm_time_tracking_role_permissions.createMany({
        data: missingPermissionIds.map((permissionId) => ({
          id: v4(),
          created_at: toISOStringSafe(new Date()),
          updated_at: toISOStringSafe(new Date()),
          hrm_time_tracking_role_id: role.id,
          permission_id: permissionId,
        })),
      });
    }
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
      where: {
        id: props.roleId,
      },
      ...HrmTimeTrackingRoleTransformer.select(),
    });
  return await HrmTimeTrackingRoleTransformer.transform(updated);
}
