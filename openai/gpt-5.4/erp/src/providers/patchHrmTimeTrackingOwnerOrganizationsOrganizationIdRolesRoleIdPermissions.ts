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
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingRoleTransformer } from "../transformers/HrmTimeTrackingRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function patchHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissions(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.IUpdatePermission;
}): Promise<IHrmTimeTrackingRole> {
  await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
    },
    select: {
      id: true,
    },
  });
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findUniqueOrThrow({
    where: {
      id: props.roleId,
    },
    select: {
      id: true,
      hrm_time_tracking_organization_id: true,
      built_in: true,
      deleted_at: true,
    },
  });
  if (role.hrm_time_tracking_organization_id !== props.organizationId) {
    throw new HttpException("Forbidden", 403);
  }
  if (role.deleted_at !== null) {
    throw new HttpException("Role not found", 404);
  }
  if (role.built_in === true) {
    throw new HttpException("Built-in roles cannot be modified", 409);
  }
  const duplicated = new Set<string>();
  for (const permission of props.body.permissions) {
    if (permission.length === 0) {
      throw new HttpException("Invalid permission code", 400);
    }
    if (duplicated.has(permission) === true) {
      throw new HttpException("Duplicate permission code", 400);
    }
    duplicated.add(permission);
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    const existing = await tx.hrm_time_tracking_role_permissions.findMany({
      where: {
        hrm_time_tracking_role_id: props.roleId,
        deleted_at: null,
      },
      select: {
        id: true,
        permission: true,
      },
    });
    const existingSet = new Set<string>();
    for (const item of existing) {
      existingSet.add(item.permission);
    }
    const requestedSet = new Set<string>();
    for (const permission of props.body.permissions) {
      requestedSet.add(permission);
    }
    const deleteIds: string[] = [];
    for (const item of existing) {
      if (requestedSet.has(item.permission) === false) {
        deleteIds.push(item.id);
      }
    }
    const createData: Prisma.hrm_time_tracking_role_permissionsCreateManyInput[] =
      [];
    for (const permission of props.body.permissions) {
      if (existingSet.has(permission) === false) {
        createData.push({
          id: v4(),
          hrm_time_tracking_role_id: props.roleId,
          permission,
          created_at: new Date(),
          updated_at: new Date(),
          deleted_at: null,
        });
      }
    }
    if (deleteIds.length !== 0) {
      await tx.hrm_time_tracking_role_permissions.deleteMany({
        where: {
          id: {
            in: deleteIds,
          },
        },
      });
    }
    if (createData.length !== 0) {
      await tx.hrm_time_tracking_role_permissions.createMany({
        data: createData,
      });
    }
    await tx.hrm_time_tracking_roles.update({
      where: {
        id: props.roleId,
      },
      data: {
        updated_at: new Date(),
      },
    });
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
