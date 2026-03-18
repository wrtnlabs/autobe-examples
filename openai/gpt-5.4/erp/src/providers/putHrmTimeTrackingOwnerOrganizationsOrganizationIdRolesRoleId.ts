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

export async function putHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  body: IHrmTimeTrackingRole.IUpdate;
}): Promise<IHrmTimeTrackingRole> {
  await MyGlobal.prisma.hrm_time_tracking_organizations.findUniqueOrThrow({
    where: {
      id: props.organizationId,
    },
  });
  const ownerRecord = await MyGlobal.prisma.hrm_time_tracking_owners.findFirst({
    where: {
      id: props.owner.id,
      deleted_at: null,
      deactivated_at: null,
    },
    select: {
      id: true,
    },
  });
  if (ownerRecord === null) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
      name: true,
      built_in: true,
      hrm_time_tracking_organization_id: true,
    },
  });
  if (role.hrm_time_tracking_organization_id !== props.organizationId) {
    throw new HttpException(
      "Role does not belong to the specified organization",
      403,
    );
  }
  if (role.built_in === true) {
    throw new HttpException("Built-in roles cannot be updated", 409);
  }
  const nextName: string = props.body.name ?? role.name;
  const desiredPermissions: string[] =
    props.body.permissions === undefined
      ? []
      : props.body.permissions.flatMap((entry) => entry.permissions);
  if (
    desiredPermissions.some(
      (permission, index) => desiredPermissions.indexOf(permission) !== index,
    )
  ) {
    throw new HttpException("Duplicate permission codes are not allowed", 400);
  }
  const permissionCatalogRows =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findMany({
      where: {
        deleted_at: null,
        role: {
          built_in: true,
          deleted_at: null,
        },
      },
      select: {
        permission: true,
      },
    });
  const permissionCatalog: Set<string> = new Set(
    permissionCatalogRows.map((row) => row.permission),
  );
  for (const permission of desiredPermissions) {
    if (permissionCatalog.has(permission) === false) {
      throw new HttpException("Invalid permission code", 400);
    }
  }
  const duplicated = await MyGlobal.prisma.hrm_time_tracking_roles.findFirst({
    where: {
      hrm_time_tracking_organization_id: props.organizationId,
      name: nextName,
      deleted_at: null,
      id: {
        not: props.roleId,
      },
    },
    select: {
      id: true,
    },
  });
  if (duplicated !== null) {
    throw new HttpException(
      "Role name already exists in this organization",
      409,
    );
  }
  await MyGlobal.prisma.$transaction(async (tx) => {
    await tx.hrm_time_tracking_roles.update({
      where: {
        id: props.roleId,
      },
      data: {
        name: nextName,
        updated_at: new Date(),
      },
    });
    if (props.body.permissions !== undefined) {
      const existingPermissions =
        await tx.hrm_time_tracking_role_permissions.findMany({
          where: {
            hrm_time_tracking_role_id: props.roleId,
            deleted_at: null,
            role: {
              hrm_time_tracking_organization_id: props.organizationId,
              deleted_at: null,
            },
          },
          select: {
            id: true,
            permission: true,
          },
        });
      const existingCodes: Set<string> = new Set(
        existingPermissions.map((permission) => permission.permission),
      );
      const desiredCodes: Set<string> = new Set(desiredPermissions);
      const revokeIds: string[] = existingPermissions
        .filter(
          (permission) => desiredCodes.has(permission.permission) === false,
        )
        .map((permission) => permission.id);
      if (revokeIds.length !== 0) {
        await tx.hrm_time_tracking_role_permissions.deleteMany({
          where: {
            id: {
              in: revokeIds,
            },
            role: {
              hrm_time_tracking_organization_id: props.organizationId,
            },
          },
        });
      }
      for (const permission of desiredPermissions) {
        if (existingCodes.has(permission) === false) {
          await tx.hrm_time_tracking_role_permissions.create({
            data: {
              id: v4(),
              permission,
              role: {
                connect: {
                  id: props.roleId,
                },
              },
              created_at: new Date(),
              updated_at: new Date(),
              deleted_at: null,
            },
          });
        }
      }
    }
  });
  const updated =
    await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
      where: {
        id: props.roleId,
        hrm_time_tracking_organization_id: props.organizationId,
        deleted_at: null,
      },
      ...HrmTimeTrackingRoleTransformer.select(),
    });
  return await HrmTimeTrackingRoleTransformer.transform(updated);
}
