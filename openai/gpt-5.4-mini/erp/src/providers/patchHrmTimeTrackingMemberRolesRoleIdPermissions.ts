import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingRole";
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

export async function patchHrmTimeTrackingMemberRolesRoleIdPermissions(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.IUpdatePermission;
}): Promise<IHrmTimeTrackingRole> {
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
    where: { id: props.roleId },
    select: {
      id: true,
      organization_id: true,
      name: true,
      code: true,
      is_builtin: true,
    },
  });
  const permissionIds = Array.from(new Set(props.body.permissionIds));
  if (permissionIds.length !== props.body.permissionIds.length) {
    throw new HttpException("Duplicate permission ids", 400);
  }
  if (role.is_builtin) {
    throw new HttpException("Forbidden", 403);
  }
  const currentPermissions =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findMany({
      where: { hrm_time_tracking_role_id: role.id },
      select: { permission_id: true },
    });
  const currentPermissionIdSet = new Set(
    currentPermissions.map((row) => row.permission_id),
  );
  const nextPermissionIdSet = new Set(permissionIds);
  await MyGlobal.prisma.$transaction(async (tx) => {
    const removePermissionIds = currentPermissions
      .filter((row) => !nextPermissionIdSet.has(row.permission_id))
      .map((row) => row.permission_id);
    const addPermissionIds = permissionIds.filter(
      (id) => !currentPermissionIdSet.has(id),
    );
    if (removePermissionIds.length > 0) {
      await tx.hrm_time_tracking_role_permissions.deleteMany({
        where: {
          hrm_time_tracking_role_id: role.id,
          permission_id: { in: removePermissionIds },
        },
      });
    }
    if (addPermissionIds.length > 0) {
      await tx.hrm_time_tracking_role_permissions.createMany({
        data: addPermissionIds.map((permissionId) => ({
          id: v4(),
          hrm_time_tracking_role_id: role.id,
          permission_id: permissionId,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        })),
        skipDuplicates: true,
      });
    }
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
      where: { id: role.id },
      ...HrmTimeTrackingRoleTransformer.select(),
    });
  return await HrmTimeTrackingRoleTransformer.transform(updated);
}
