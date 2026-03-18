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

export async function patchHrmTimeTrackingMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.IUpdate;
}): Promise<IHrmTimeTrackingRole> {
  const current =
    await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
      where: {
        id: props.roleId,
      },
      select: {
        id: true,
        organization_id: true,
        is_builtin: true,
        name: true,
      },
    });
  if (current.is_builtin) {
    throw new HttpException("Built-in roles cannot be edited", 400);
  }
  const permissionIds =
    props.body.permissions === undefined
      ? undefined
      : Array.from(
          new Set(
            props.body.permissions.flatMap(
              (permission) => permission.permissionIds,
            ),
          ),
        );
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_roles.update({
      where: {
        id: props.roleId,
      },
      data: {
        ...(props.body.name !== undefined && { name: props.body.name }),
        ...(props.body.code !== undefined && { code: props.body.code }),
        ...(props.body.description !== undefined && {
          description: props.body.description,
        }),
        ...(props.body.sortOrder !== undefined && {
          sort_order: props.body.sortOrder,
        }),
        updated_at: new Date(),
      },
    });
    if (permissionIds !== undefined) {
      await tx.hrm_time_tracking_role_permissions.deleteMany({
        where: {
          hrm_time_tracking_role_id: props.roleId,
        },
      });
      if (permissionIds.length > 0) {
        await tx.hrm_time_tracking_role_permissions.createMany({
          data: permissionIds.map((permissionId) => ({
            id: v4(),
            hrm_time_tracking_role_id: props.roleId,
            permission_id: permissionId,
            created_at: new Date(),
            updated_at: new Date(),
          })),
        });
      }
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
