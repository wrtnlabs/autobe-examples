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

export async function putHrmTimeTrackingMemberRolesRoleId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.IUpdate;
}): Promise<IHrmTimeTrackingRole> {
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
    },
    select: {
      id: true,
      organization_id: true,
      name: true,
      code: true,
      description: true,
      is_builtin: true,
      sort_order: true,
      created_at: true,
      updated_at: true,
      deleted_at: true,
    },
  });
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  if (role.is_builtin) {
    throw new HttpException("Built-in roles cannot be modified", 422);
  }
  const organization =
    await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
      where: {
        id: role.organization_id,
      },
      select: {
        id: true,
      },
    });
  void organization;
  void props.member;
  if (props.body.name !== undefined || props.body.code !== undefined) {
    const conflict = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
      where: {
        organization_id: role.organization_id,
        deleted_at: null,
        NOT: {
          id: props.roleId,
        },
        OR: [
          ...(props.body.name !== undefined ? [{ name: props.body.name }] : []),
          ...(props.body.code !== undefined ? [{ code: props.body.code }] : []),
        ],
      },
      select: {
        id: true,
      },
    });
    if (conflict !== null) {
      throw new HttpException("Role name or code already exists", 409);
    }
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_roles.update({
      where: {
        id: props.roleId,
      },
      data: {
        ...(props.body.name !== undefined ? { name: props.body.name } : {}),
        ...(props.body.code !== undefined ? { code: props.body.code } : {}),
        ...(props.body.description !== undefined
          ? { description: props.body.description }
          : {}),
        ...(props.body.sortOrder !== undefined
          ? { sort_order: props.body.sortOrder }
          : {}),
        updated_at: toISOStringSafe(new Date()) as unknown as Date,
      },
    });
    if (props.body.permissions !== undefined) {
      const desiredPermissionIds = props.body.permissions.flatMap(
        (item) => item.permissionIds,
      );
      const uniquePermissionIds = Array.from(new Set(desiredPermissionIds));
      if (uniquePermissionIds.length !== desiredPermissionIds.length) {
        throw new HttpException(
          "Duplicate permission ids are not allowed",
          422,
        );
      }
      const existingPermissions =
        await tx.hrm_time_tracking_role_permissions.findMany({
          where: {
            hrm_time_tracking_role_id: props.roleId,
          },
          select: {
            id: true,
            permission_id: true,
          },
        });
      const catalog = await tx.hrm_time_tracking_role_permissions.findMany({
        where: {
          permission_id: {
            in: uniquePermissionIds,
          },
        },
        select: {
          permission_id: true,
        },
      });
      const catalogPermissionIds = new Set(
        catalog.map((item) => item.permission_id),
      );
      if (catalogPermissionIds.size !== uniquePermissionIds.length) {
        throw new HttpException("Invalid permission ids", 422);
      }
      await tx.hrm_time_tracking_role_permissions.deleteMany({
        where: {
          hrm_time_tracking_role_id: props.roleId,
          permission_id: {
            notIn: uniquePermissionIds,
          },
        },
      });
      const currentPermissionIds = new Set(
        existingPermissions.map((item) => item.permission_id),
      );
      const newPermissionIds = uniquePermissionIds.filter(
        (permissionId) => !currentPermissionIds.has(permissionId),
      );
      if (newPermissionIds.length > 0) {
        await tx.hrm_time_tracking_role_permissions.createMany({
          data: newPermissionIds.map((permissionId) => ({
            id: v4(),
            hrm_time_tracking_role_id: props.roleId,
            permission_id: permissionId,
            created_at: toISOStringSafe(new Date()) as unknown as Date,
            updated_at: toISOStringSafe(new Date()) as unknown as Date,
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
  return HrmTimeTrackingRoleTransformer.transform(updated);
}
