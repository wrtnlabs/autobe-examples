import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { ArrayUtil } from "@nestia/e2e";
import { HttpException } from "@nestjs/common";
import { Prisma } from "@prisma/sdk";
import jwt from "jsonwebtoken";
import typia, { tags } from "typia";
import { v4 } from "uuid";

import { MyGlobal } from "../MyGlobal";
import { OwnerPayload } from "../decorators/payload/OwnerPayload";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function deleteHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<void> {
  if (props.owner.id !== props.organizationId) {
    throw new HttpException("Forbidden", 403);
  }
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      hrm_time_tracking_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
      built_in: true,
    },
  });
  if (role.built_in === true) {
    throw new HttpException("Built-in roles cannot be modified", 403);
  }
  await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirstOrThrow({
    where: {
      id: props.permissionId,
      hrm_time_tracking_role_id: role.id,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.$transaction([
    MyGlobal.prisma.hrm_time_tracking_role_permissions.update({
      where: {
        id: props.permissionId,
      },
      data: {
        updated_at: new Date(),
        deleted_at: new Date(),
      },
    }),
  ]);
}
