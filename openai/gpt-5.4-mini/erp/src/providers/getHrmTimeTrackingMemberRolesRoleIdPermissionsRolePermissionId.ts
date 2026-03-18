import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { IHrmTimeTrackingOrganization } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingOrganization";
import { IHrmTimeTrackingPermission } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingPermission";
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
import { HrmTimeTrackingRolePermissionTransformer } from "../transformers/HrmTimeTrackingRolePermissionTransformer";
import { PasswordUtil } from "../utils/PasswordUtil";
import { toISOStringSafe } from "../utils/toISOStringSafe";

export async function getHrmTimeTrackingMemberRolesRoleIdPermissionsRolePermissionId(props: {
  member: MemberPayload;
  roleId: string & tags.Format<"uuid">;
  rolePermissionId: string & tags.Format<"uuid">;
}): Promise<IHrmTimeTrackingRolePermission> {
  const role = await MyGlobal.prisma.hrm_time_tracking_roles.findFirstOrThrow({
    where: {
      id: props.roleId,
      deleted_at: null,
    },
    select: {
      id: true,
    },
  });
  const permissionGrant =
    await MyGlobal.prisma.hrm_time_tracking_role_permissions.findFirstOrThrow({
      where: {
        id: props.rolePermissionId,
        hrm_time_tracking_role_id: role.id,
        deleted_at: null,
      },
      ...HrmTimeTrackingRolePermissionTransformer.select(),
    });
  return await HrmTimeTrackingRolePermissionTransformer.transform(
    permissionGrant,
  );
}
