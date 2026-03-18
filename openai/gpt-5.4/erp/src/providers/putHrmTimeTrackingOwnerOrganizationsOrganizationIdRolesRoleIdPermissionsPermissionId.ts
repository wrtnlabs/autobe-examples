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
import { HrmTimeTrackingRolePermissionTransformer } from "../transformers/HrmTimeTrackingRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function putHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRolePermission.IUpdate;
}): Promise<IHrmTimeTrackingRolePermission> {
  const PERMISSIONS: ReadonlySet<string> = new Set<string>([
    "org:manage",
    "employee:manage",
    "employee:view",
    "department:manage",
    "department:view",
    "project:manage",
    "project:view",
    "task:manage",
    "task:view",
    "time:track",
    "time:approve",
    "timesheet:submit",
    "report:view",
    "role:manage",
  ]);
  if (PERMISSIONS.has(props.body.permission) === false) {
    throw new HttpException("Invalid permission code", 400);
  }
  await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_owners
    .findUniqueOrThrow({
      where: {
        id: props.owner.id,
      },
      select: {
        id: true,
        deleted_at: true,
        deactivated_at: true,
      },
    })
    .then((owner) => {
      if (owner.deleted_at !== null || owner.deactivated_at !== null) {
        throw new HttpException("Forbidden", 403);
      }
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
    throw new HttpException("Not Found", 404);
  }
  if (role.built_in === true) {
    throw new HttpException("Built-in roles cannot be edited", 403);
  }
  const permissionAssignment =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findUniqueOrThrow({
      where: {
        id: props.permissionId,
      },
      select: {
        id: true,
        hrm_time_tracking_role_id: true,
        deleted_at: true,
      },
    });
  if (permissionAssignment.hrm_time_tracking_role_id !== props.roleId) {
    throw new HttpException("Forbidden", 403);
  }
  if (permissionAssignment.deleted_at !== null) {
    throw new HttpException("Not Found", 404);
  }
  const duplicated =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirst({
      where: {
        hrm_time_tracking_role_id: props.roleId,
        permission: props.body.permission,
        deleted_at: null,
        id: {
          not: props.permissionId,
        },
      },
      select: {
        id: true,
      },
    });
  if (duplicated !== null) {
    throw new HttpException("Duplicate permission assignment", 409);
  }
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_time_tracking_role_permissions.update({
      where: {
        id: props.permissionId,
      },
      data: {
        permission: props.body.permission,
      },
    }),
  ]);
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findUniqueOrThrow({
      where: {
        id: props.permissionId,
      },
      ...HrmTimeTrackingRolePermissionTransformer.select(),
    });
  return await HrmTimeTrackingRolePermissionTransformer.transform(updated);
}
