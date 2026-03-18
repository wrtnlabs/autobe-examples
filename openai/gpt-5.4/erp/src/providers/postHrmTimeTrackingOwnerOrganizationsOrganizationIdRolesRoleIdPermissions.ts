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
import { HrmTimeTrackingRolePermissionCollector } from "../collectors/HrmTimeTrackingRolePermissionCollector";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { HrmTimeTrackingRoleTransformer } from "../transformers/HrmTimeTrackingRoleTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function postHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissions(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRolePermission.ICreate;
}): Promise<IHrmTimeTrackingRole> {
  await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
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
    },
  });
  if (role.hrm_time_tracking_organization_id !== props.organizationId) {
    throw new HttpException(
      "Role does not belong to the specified organization",
      409,
    );
  }
  if (role.built_in === true) {
    throw new HttpException(
      "Built-in roles cannot be modified through this endpoint",
      409,
    );
  }
  const normalizedPermissions: IHrmTimeTrackingRolePermission.ICreate["permissions"] =
    props.body.permissions.filter(
      (permission, index, array) => array.indexOf(permission) === index,
    ) as IHrmTimeTrackingRolePermission.ICreate["permissions"];
  if (normalizedPermissions.length !== props.body.permissions.length) {
    throw new HttpException("Duplicate permission codes in request body", 409);
  }
  const existingPermissions =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findMany({
      where: {
        hrm_time_tracking_role_id: props.roleId,
        deleted_at: null,
        permission: {
          in: normalizedPermissions,
        },
      },
      select: {
        permission: true,
      },
    });
  if (existingPermissions.length !== 0) {
    throw new HttpException(
      "One or more permissions are already assigned to this role",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (prisma) => {
    const collected = await HrmTimeTrackingRolePermissionCollector.collect({
      body: {
        permissions: normalizedPermissions,
      },
      role: {
        id: role.id,
      },
    });
    await prisma.hrm_time_tracking_role_permissions.createMany({
      data: collected.map((permission) => ({
        id: permission.id,
        hrm_time_tracking_role_id: role.id,
        permission: permission.permission,
        created_at: permission.created_at,
        updated_at: permission.updated_at,
        deleted_at: permission.deleted_at,
      })),
    });
    await prisma.hrm_time_tracking_roles.update({
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
