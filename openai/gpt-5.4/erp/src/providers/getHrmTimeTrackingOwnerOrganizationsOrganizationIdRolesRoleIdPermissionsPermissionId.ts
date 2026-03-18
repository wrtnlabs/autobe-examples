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

export async function getHrmTimeTrackingOwnerOrganizationsOrganizationIdRolesRoleIdPermissionsPermissionId(props: {
  owner: OwnerPayload;
  organizationId: string & tags.Format<"uuid">;
  roleId: string & tags.Format<"uuid">;
  permissionId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingRolePermission> {
  await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      hrm_time_tracking_organization_id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  await MyGlobal.prisma.hrm_time_tracking_organizations.findFirstOrThrow({
    where: {
      id: props.organizationId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const permission =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirstOrThrow({
      where: {
        id: props.permissionId,
        hrm_time_tracking_role_id: props.roleId,
        deleted_at: null,
        role: {
          hrm_time_tracking_organization_id: props.organizationId,
          deleted_at: null,
        },
      },
      ...HrmTimeTrackingRolePermissionTransformer.select(),
    });
  return await HrmTimeTrackingRolePermissionTransformer.transform(permission);
}
